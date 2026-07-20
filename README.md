# through777 Run Bug

完全离线的桌面跑酷小游戏，玩法参考 Chrome 断网小恐龙。

## 游戏截图

### 跑酷玩法

![Pixel Girl 躲避 ERROR 障碍](./gameplay.png)

### 1000 分女朋友奖励

![每 1000 分触发的女朋友奖励卡片](./girlfriend-reward.png)

### Codex 桌面宠物

同一套像素角色图集还可以安装成 Codex 桌面宠物。

![Pixel Girl 在 Codex 中作为桌面宠物运行](./codex-pet.png)

## 启动

双击桌面的“through777 Run Bug”启动文件，或运行 `launch-game.ps1`。

## 操作

- 空格 / ↑ / 点击画面：跳跃、开始、重新开始
- P：暂停或继续
- 右上角按钮：开关音效

游戏只读取本地文件，不访问网络，不调用任何 AI 接口，也不消耗 Token。最高分保存在本机浏览器存储中。

## 奖励与怪物

- 每 1000 分触发一次女朋友奖励消息，并在阅读时暂停游戏。
- 内置 30 条暖心文案，同一局内优先不重复。
- 10000 分触发“你为了这个家好辛苦，咱们结婚吧”专属结局菜单。
- 障碍包含甲虫、错误弹窗、警告栈、史莱姆、病毒球、蜘蛛、故障方块、字节怪和幽灵等 9 类怪物，每类还会随机变化配色。

奖励文案见 [REWARD_MESSAGES.zh-CN.md](./REWARD_MESSAGES.zh-CN.md)。

完整的像素角色生成、Codex 宠物安装、游戏实现和 Windows EXE 打包流程，请阅读 [BUILD_GUIDE.zh-CN.md](./BUILD_GUIDE.zh-CN.md)。
