import paramiko


HOST = "101.43.123.29"
USER = "ubuntu"
PASS = "dp5h5x@12345678@"
APP_ID = "2034157411355818752"
APP_KEY = "HncF4Thd9dF1nggdTlB0SqDKPRYdBoxI"


def run(ssh: paramiko.SSHClient, cmd: str, title: str) -> tuple[int, str, str]:
    print(f"\n==== {title} ====")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    print(f"exit_code={code}")
    if out:
        print(out.encode("ascii", "ignore").decode())
    if err:
        print(err.encode("ascii", "ignore").decode())
    return code, out, err


def main() -> None:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, look_for_keys=False, allow_agent=False, timeout=30)

    try:
        # 更新后端环境变量
        run(
            ssh,
            (
                f"echo '{PASS}' | sudo -S sh -c \""
                "if grep -q '^YUANQI_APP_ID=' /opt/goutcare/.env; then "
                f"sed -i 's#^YUANQI_APP_ID=.*#YUANQI_APP_ID={APP_ID}#' /opt/goutcare/.env; "
                f"else echo 'YUANQI_APP_ID={APP_ID}' >> /opt/goutcare/.env; fi; "
                "if grep -q '^YUANQI_APP_KEY=' /opt/goutcare/.env; then "
                f"sed -i 's#^YUANQI_APP_KEY=.*#YUANQI_APP_KEY={APP_KEY}#' /opt/goutcare/.env; "
                f"else echo 'YUANQI_APP_KEY={APP_KEY}' >> /opt/goutcare/.env; fi; "
                "grep -E '^YUANQI_APP_ID=|^YUANQI_APP_KEY=' /opt/goutcare/.env | sed 's/YUANQI_APP_KEY=.*/YUANQI_APP_KEY=***MASKED***/'\""
            ),
            "Update appid/appkey in /opt/goutcare/.env",
        )

        run(
            ssh,
            f"echo '{PASS}' | sudo -S sh -c 'cd /opt/goutcare && docker compose up -d backend'",
            "Restart backend",
        )

        payload = (
            "{"
            f"\\\"assistant_id\\\":\\\"{APP_ID}\\\","
            "\\\"user_id\\\":\\\"probe-user\\\","
            "\\\"stream\\\":false,"
            "\\\"messages\\\":[{\\\"role\\\":\\\"user\\\",\\\"content\\\":[{\\\"type\\\":\\\"text\\\",\\\"text\\\":\\\"你好\\\"}]}]"
            "}"
        )

        run(
            ssh,
            (
                "curl -s -i -m 25 https://yuanqi.tencent.com/openapi/v1/agent/chat/completions "
                "-H \"X-Source: openapi\" -H \"Content-Type: application/json\" "
                f"-H \"Authorization: Bearer {APP_KEY}\" "
                f"--data \"{payload}\""
            ),
            "Direct Yuanqi endpoint probe",
        )

        # 端到端检查
        token_cmd = (
            f"echo '{PASS}' | sudo -S docker exec goutcare-backend "
            "node -e \"const jwt=require('jsonwebtoken');"
            "const t=jwt.sign({id:'doctor-debug',username:'doctor-debug',nickName:'doctor-debug',role:'doctor'}, process.env.JWT_SECRET,{expiresIn:'10m'});"
            "console.log(t);\""
        )
        _, token_out, _ = run(ssh, token_cmd, "Generate JWT token")
        token = token_out.strip().splitlines()[-1] if token_out.strip() else ""
        if token:
            run(
                ssh,
                (
                    "curl -k -s -N -m 35 -X POST https://127.0.0.1/api/ai/chat "
                    f"-H \"Cookie: token={token}\" "
                    "-H \"Content-Type: application/json\" "
                    "--data '{\"message\":\"痛风患者合并肾功能不全，降尿酸治疗建议？\",\"history\":[]}'"
                ),
                "End-to-end /api/ai/chat probe",
            )
    finally:
        ssh.close()


if __name__ == "__main__":
    main()
