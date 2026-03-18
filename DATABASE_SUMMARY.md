# 数据库汇总 (Database Summary)

生成时间: 2026/3/18 09:41:28

本文档汇总了当前腾讯云 CloudBase 数据库中各个集合（Collection）的记录总数、字段结构推断以及样本数据。

---

## 集合: `users`
- **总记录数**: 124
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "_openid": "string",
    "username": "string",
    "password": "string",
    "nickName": "string",
    "role": "string",
    "avatar": "string",
    "createdAt": "Date",
    "lastLoginAt": "Date"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "user_002",
    "_openid": "oo1l21wbD3-Yb-y_DwX4uCBy8MZ8",
    "username": "patient_02",
    "password": "***HIDDEN***",
    "nickName": "李四",
    "role": "doctor",
    "avatar": "",
    "createdAt": "2024-02-02T11:00:00.000Z",
    "lastLoginAt": "2026-03-15T13:12:40.941Z"
  }
  ```

---

## 集合: `uaRecords`
- **总记录数**: 5
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "createdAt": "number",
    "timestamp": "number",
    "value": "number",
    "_openid": "string"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "9e7a4bf169a3dfdf0005e166425ccf5a",
    "createdAt": 1772323200000,
    "timestamp": 1772323200000,
    "value": 360,
    "_openid": "oo1l21wbD3-Yb-y_DwX4uCBy8MZ8"
  }
  ```

---

## 集合: `attackRecords`
- **总记录数**: 1
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "duration": "string",
    "joints": "Array",
    "originalJoints": "Array",
    "painLevel": "number",
    "startDate": "number",
    "status": "string",
    "triggers": "Array",
    "timestamp": "number",
    "createdAt": "number",
    "_openid": "string"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "df1ef75669a5dd600017606656de1285",
    "duration": "",
    "joints": [
      "肩关节"
    ],
    "originalJoints": [
      "肩关节"
    ],
    "painLevel": 0,
    "startDate": 1772477793346,
    "status": "ongoing",
    "triggers": [
      "豆类及豆制品"
    ],
    "timestamp": 1772477791914,
    "createdAt": 1772477791914,
    "_openid": "oo1l213xPNR1jJlNsOYSe_BEXg0I"
  }
  ```

---

## 集合: `waterRecords`
- **总记录数**: 5
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "amount": "number",
    "date": "string",
    "type": "string",
    "volume": "number",
    "timestamp": "number",
    "createdAt": "number",
    "_openid": "string"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "3305e60569a551b8000de69606f60aa0",
    "amount": 200,
    "date": "2026-03-02",
    "type": "water",
    "volume": 200,
    "timestamp": 1772442040308,
    "createdAt": 1772442040308,
    "_openid": "oo1l213xPNR1jJlNsOYSe_BEXg0I"
  }
  ```

---

## 集合: `exerciseRecords`
- **总记录数**: 0
- **状态**: 当前为空集合

---

## 集合: `medicationReminders`
- **总记录数**: 2
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "dosage": "string",
    "frequency": "string",
    "name": "string",
    "status": "string",
    "type": "string",
    "timestamp": "number",
    "createdAt": "number",
    "_openid": "string"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "877e759169a78355001b96423f7d5ad3",
    "dosage": "40mg",
    "frequency": "每日一次",
    "name": "非布司他",
    "status": "pending",
    "type": "capsule",
    "timestamp": 1772585813324,
    "createdAt": 1772585813324,
    "_openid": "oo1l213xPNR1jJlNsOYSe_BEXg0I"
  }
  ```

---

## 集合: `dietRecords`
- **总记录数**: 7
- **字段结构推断**:
  ```json
  {
    "_id": "string",
    "category": "string",
    "color": "string",
    "date": "string",
    "mealType": "string",
    "name": "string",
    "purineLevel": "string",
    "timestamp": "number",
    "createdAt": "number",
    "_openid": "string"
  }
  ```

- **数据样本 (1条)**:
  ```json
  {
    "_id": "81aee67169a410340007510c591c6e5c",
    "category": "早餐",
    "color": "low",
    "date": "2026-03-01",
    "mealType": "早餐",
    "name": "白菜",
    "purineLevel": "low",
    "timestamp": 1772359732645,
    "createdAt": 1772359732645,
    "_openid": "oo1l213xPNR1jJlNsOYSe_BEXg0I"
  }
  ```

---

