# Direction Approved · 大学生刷题 UI 重做

> 设计闸门文件(三方向硬门产物)。用户已基于看到的真实视觉选定方向,实现开工前必须有此文件。

## 展示过的版本
- v1 三版(direction-1/2/3.html):朱红 + 宋体 + 考卷/印章 家族。用户判定「这三个都不怎么好,有没有别的」→ 否决。根因:三版塌进同一个传统符号框,读起来模板化、显老气。
- v2 三版(v2-1/2/3.html):现代克制 · 像好产品 家族(彻底放下传统符号)。截图 design-demos/shots/v2-{1,2,3}-{home,practice}.png。

## 用户选择(原话)
> 「v2-1 · 冷静效率 (推荐)」

## 选定方向设计语言(v2-1)
- 强调色:沉静靛蓝 #2f4a7c,仅用于 当前 Tab 下划线 / 进度(环+条)/ 判分对错 / 主按钮 / 综合练习兜底卡。不铺满。
- 底:近白中性 #f5f6f8;卡片 #fff;文字墨 #1c1d21;边框 #e6e8eb。卡片均匀细边框,无左彩条、无阴影。
- 字体:无衬线主导。Noto Sans SC + 系统回退 'PingFang SC' / 'Microsoft YaHei'。禁止宋体刊头、禁止 Arial 兜底中文。
- 首页:克制卡片网格(细边框)+ 每卡进度环;练习页:居中单卡,模式 Tab 当前态 = 靛蓝下划线,选项选中 = 靛蓝描边(非填充),主按钮 = 实色靛蓝。
- 红线:无紫渐变、无 emoji 图标(🔀/🎉 改为文字)、无圆角卡+左彩条、无 blue-600+zinc。

## 实现范围与顺序
1. 设计系统 app/globals.css(@theme tokens)+ app/layout.tsx(Noto Sans SC 字体链接)。浅色主题,移除 auto 暗色。
2. 首页 app/page.tsx:语义色 + 进度环组件 + 靛蓝强调。
3. 练习页 app/practice/page.tsx + components/QuestionCard / ReviewCard / Summary:靛蓝 Tab/进度/选项描边/按钮。
4. 铺开:错题本 / 历史 / 导入,沿用同一 tokens。
5. 验证:build 跑通 + Playwright 截真实页面 + 控制台无错。

## 功能不变原则
只改视觉层(className / 全局 token / 少量展示型原语),不动:localStorage 进度、SRS 复习、CSV/JSON 导入、键盘答题、各模式筛选。
