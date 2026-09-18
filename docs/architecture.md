# 架构与核验语义

## 为什么区分自动提示与人工结论

检索回答的是「哪些原文值得看」，人工复核回答的是「证据是否支持这条要求」。词面相似并不能验证数值约束、适用范围或否定作用域。

自动提示只有 `candidate`、`conflict`、`missing` 三类。`conflict` 是关键词级的保守提醒；`missing` 仅表示检索未找到足够相关的片段。所有条款最初均为 `pending`，自动匹配不会产生通过或不通过结论。

人工结论为 `supported`、`partial`、`unsupported`、`missing`、`excluded` 或 `pending`。前三种必须关联响应原文片段；所有已复核结论必须填写依据。

## 数据关系

一次 session 持有固定的需求文档和响应文档，各有文件名、内容 SHA-256、原文 blocks、解析警告。原始文件字节保存在 SQLite BLOB 中，解析快照、匹配结果和复核历史为 JSON。

每个 clause 带有需求 block_id、原文位置及字符起止偏移。每个候选指向响应 block_id，并记录 BM25 分数、词面覆盖率和共同词项。复核保存 evidence_id 与理由；报告引用的文字来自存储原文，而非模型生成。

## 一致性

复核在 SQLite `BEGIN IMMEDIATE` 事务内读取、检查 revision、追加历史、更新快照。客户端必须提交读取时的 revision，落后版本返回 409。历史记录包含时间、条款及修改前后值；没有用户身份、密码学签名或独立追加存储，因此不能将其称为防篡改审计。

## 检索基线

中文连续片段按双字切分，英文和数字按词切分，去除少量通用词。使用 BM25（k1=1.5，b=0.75）对响应片段排序，取前三项。第一候选的词面覆盖率至少 0.22 且共有词至少 2 个时提示候选证据。阈值是开发期启发式，不是校准后的概率。

引擎版本存入任务，后续修改算法不会悄悄改变已保存任务。数值不一致目前只生成核对提醒，不执行自动否决。向量检索和模型判断应作为可比较的后续实现，并保留当前确定性基线。

## API

| 请求 | 用途 |
| --- | --- |
| GET /api/health | 健康状态与引擎版本 |
| GET /api/sessions | 历史任务摘要 |
| POST /api/sessions | multipart：requirement、response |
| POST /api/demo | 创建独立演示任务 |
| GET /api/sessions/{id} | 获取完整核验快照 |
| PUT /api/sessions/{id}/reviews/{clause_id} | revision、decision、note、evidence_id |
| GET /api/sessions/{id}/source/{kind} | 下载原始需求或响应文件 |
| GET /api/sessions/{id}/export?format=md/csv/json | 导出报告 |

交互式接口说明位于 `/docs`。服务仅用于本地单人工作空间；大规模处理、后台任务、多用户认证和上传解析隔离尚未实现。
