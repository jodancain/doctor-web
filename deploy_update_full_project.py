import os
import tarfile
import time
from datetime import datetime
from pathlib import Path

import paramiko


HOST = "101.43.123.29"
PORT = 22
USERNAME = "ubuntu"
PASSWORD = "dp5h5x@12345678@"
REMOTE_DIR = "/opt/goutcare"


def should_exclude(rel_posix: str, archive_name: str) -> bool:
    if rel_posix == archive_name:
        return True
    if rel_posix == ".env":
        # Keep server-side env as source of truth in production.
        return True
    if rel_posix.startswith(".git/") or rel_posix == ".git":
        return True
    if rel_posix.startswith("__pycache__/") or rel_posix.endswith(".pyc"):
        return True
    if rel_posix.startswith(".cursor/"):
        return True
    if rel_posix.startswith("agent-tools/"):
        return True
    if rel_posix.endswith("SecretKey.csv"):
        return True
    return False


def create_archive(root: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive_name = f"goutcare_update_{ts}.tar.gz"
    archive_path = root / archive_name
    skipped = 0

    print(f"[1/6] Create archive: {archive_name}")
    with tarfile.open(archive_path, "w:gz") as tar:
        for dirpath, dirnames, filenames in os.walk(root):
            current = Path(dirpath)
            rel_dir = current.relative_to(root)
            if rel_dir.as_posix() == ".git":
                dirnames[:] = []
                continue
            dirnames[:] = [d for d in dirnames if d not in {".git", "__pycache__", ".cursor"}]

            for fname in filenames:
                rel_file = (rel_dir / fname) if rel_dir != Path(".") else Path(fname)
                rel_posix = rel_file.as_posix()
                if should_exclude(rel_posix, archive_name) or fname.startswith("~$"):
                    skipped += 1
                    continue
                full_path = root / rel_file
                try:
                    tar.add(full_path, arcname=rel_posix, recursive=False)
                except (PermissionError, OSError):
                    skipped += 1

    print(f"Archive size: {archive_path.stat().st_size / 1024 / 1024:.2f} MB, skipped: {skipped}")
    return archive_path


def run_remote(ssh: paramiko.SSHClient, cmd: str, title: str, check: bool = True) -> tuple[int, str, str]:
    print(f"\n[remote] {title}")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.encode("ascii", "ignore").decode())
    if err:
        print(err.encode("ascii", "ignore").decode())
    print(f"exit_code={code}")
    if check and code != 0:
        raise RuntimeError(f"Remote command failed ({code}): {title}")
    return code, out, err


def wait_http(ssh: paramiko.SSHClient, tries: int = 10, sleep_s: int = 3) -> bool:
    for i in range(1, tries + 1):
        code, out, _ = run_remote(
            ssh,
            "curl -s -m 10 https://127.0.0.1/api/health -k || true",
            f"Health probe attempt {i}",
            check=False,
        )
        if code == 0 and "\"status\":\"ok\"" in out:
            return True
        time.sleep(sleep_s)
    return False


def main() -> None:
    root = Path.cwd()
    archive = create_archive(root)
    remote_archive = f"/tmp/{archive.name}"

    print("[2/6] Connect server")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=HOST,
        port=PORT,
        username=USERNAME,
        password=PASSWORD,
        look_for_keys=False,
        allow_agent=False,
        timeout=30,
    )

    try:
        run_remote(
            ssh,
            f"echo '{PASSWORD}' | sudo -S mkdir -p {REMOTE_DIR} && "
            f"echo '{PASSWORD}' | sudo -S chown {USERNAME}:{USERNAME} {REMOTE_DIR}",
            "Ensure deploy directory",
        )

        print("[3/6] Upload archive")
        sftp = ssh.open_sftp()
        try:
            sftp.put(str(archive), remote_archive)
        finally:
            sftp.close()

        print("[4/6] Extract update package")
        run_remote(ssh, f"tar -xzf {remote_archive} -C {REMOTE_DIR}", "Extract archive into /opt/goutcare")
        run_remote(ssh, f"rm -f {remote_archive}", "Cleanup remote temp archive")

        print("[5/6] Rebuild and restart services")
        run_remote(
            ssh,
            f"echo '{PASSWORD}' | sudo -S sh -c 'cd {REMOTE_DIR} && docker compose up -d --build'",
            "docker compose up -d --build",
        )
        run_remote(
            ssh,
            f"echo '{PASSWORD}' | sudo -S sh -c 'cd {REMOTE_DIR} && docker compose ps'",
            "docker compose ps",
            check=False,
        )

        print("[6/6] Verify health")
        ok = wait_http(ssh)
        if not ok:
            run_remote(
                ssh,
                f"echo '{PASSWORD}' | sudo -S sh -c 'cd {REMOTE_DIR} && docker compose logs --tail=120 backend nginx'",
                "Dump recent backend/nginx logs",
                check=False,
            )
            raise RuntimeError("Health check failed after deploy")

        print("\nDeployment update completed successfully.")
    finally:
        ssh.close()
        try:
            archive.unlink(missing_ok=True)
        except OSError:
            pass


if __name__ == "__main__":
    main()
