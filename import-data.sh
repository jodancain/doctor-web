#!/bin/bash
# ============================================================
# 痛风管家 — 数据库导入脚本
# 将 CloudBase 导出的用户数据导入到 Docker MongoDB 中
# ============================================================

set -e

DATA_FILE="${1:-database_export-DN4iCnjKWmZl.json}"
CONTAINER="goutcare-mongo"
DB_NAME="goutcare"
COLLECTION="users"

# 从 .env 读取密码
if [ -f ".env" ]; then
  MONGO_PASSWORD=$(grep MONGO_PASSWORD .env | cut -d= -f2)
fi
MONGO_PASSWORD="${MONGO_PASSWORD:-GoutCare2026Secure}"

echo "=========================================="
echo "  痛风管家 — 数据库导入"
echo "=========================================="
echo ""
echo "  数据文件: ${DATA_FILE}"
echo "  目标集合: ${DB_NAME}.${COLLECTION}"
echo ""

# 检查文件是否存在
if [ ! -f "${DATA_FILE}" ]; then
  echo "❌ 数据文件不存在: ${DATA_FILE}"
  echo "   请将导出文件放在当前目录，或指定路径："
  echo "   ./import-data.sh /path/to/database_export.json"
  exit 1
fi

# 检查 Docker 容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "${CONTAINER}"; then
  echo "❌ MongoDB 容器 ${CONTAINER} 未运行"
  echo "   请先启动服务: docker compose up -d"
  exit 1
fi

RECORD_COUNT=$(wc -l < "${DATA_FILE}")
echo "📊 共 ${RECORD_COUNT} 条记录"
echo ""

# 复制数据文件到容器内
echo "📁 复制数据到 MongoDB 容器..."
docker cp "${DATA_FILE}" "${CONTAINER}:/tmp/import.json"

# 使用 mongoimport 导入（NDJSON 格式，即每行一个 JSON）
echo "🔄 导入数据到 ${DB_NAME}.${COLLECTION}..."
docker exec "${CONTAINER}" mongoimport \
  --uri="mongodb://admin:${MONGO_PASSWORD}@localhost:27017/${DB_NAME}?authSource=admin" \
  --collection="${COLLECTION}" \
  --file="/tmp/import.json" \
  --mode=upsert \
  --upsertFields="_id"

echo ""

# 清理容器内的临时文件
docker exec "${CONTAINER}" rm -f /tmp/import.json

# 验证导入结果
echo "🔍 验证导入结果..."
TOTAL=$(docker exec "${CONTAINER}" mongosh \
  --quiet \
  --eval "db.getSiblingDB('${DB_NAME}').${COLLECTION}.countDocuments()" \
  "mongodb://admin:${MONGO_PASSWORD}@localhost:27017/?authSource=admin")

DOCTORS=$(docker exec "${CONTAINER}" mongosh \
  --quiet \
  --eval "db.getSiblingDB('${DB_NAME}').${COLLECTION}.countDocuments({role:'doctor'})" \
  "mongodb://admin:${MONGO_PASSWORD}@localhost:27017/?authSource=admin")

PATIENTS=$(docker exec "${CONTAINER}" mongosh \
  --quiet \
  --eval "db.getSiblingDB('${DB_NAME}').${COLLECTION}.countDocuments({role:'user'})" \
  "mongodb://admin:${MONGO_PASSWORD}@localhost:27017/?authSource=admin")

echo ""
echo "=========================================="
echo "  ✅ 导入完成！"
echo "=========================================="
echo "  总用户数:   ${TOTAL}"
echo "  医生数:     ${DOCTORS}"
echo "  患者数:     ${PATIENTS}"
echo "=========================================="
echo ""
echo "⚠️  注意事项:"
echo "  - 部分账号密码是明文(123/password123)，首次登录后会自动迁移为 bcrypt 哈希"
echo "  - 部分医生密码为 0（数字），需要手动重置密码才能登录"
echo ""
