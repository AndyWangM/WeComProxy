# WeComProxy - Claude Code 项目规范

## 分支工作流（重要）

**严禁直接提交到 main 分支**，main 分支已设置保护规则。

正确的提交流程：

```
feat/xxx 分支
    └─ git commit
         └─ 合并到 dev
              └─ 运行 release 脚本打 tag（scripts/release.bat 或 scripts/release.sh）
```

1. 从 `dev` 创建功能分支：`feat/xxx`
2. 在功能分支上开发并提交
3. 合并到 `dev` 分支
4. 需要发布时运行 release 脚本，参考 `docs/RELEASE_GUIDE.md`
