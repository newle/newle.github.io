# 常用插件
1. outline：可以用来看文档目录，以及调整目录顺序。Add @[V0.8.1](https://forum.obsidian.md/t/obsidian-release-v0-8-1/3487)
2. unique note creator: 快捷键建立新 note
3. Obsidian Git: 可以同步数据到 git 仓库
4. [[3aa Obsidian Query Control]]: https://github.com/nothingislost/obsidian-query-control/ 通过 BRAT 安装 Beta 版本
5. Format Code blocks: 支持 json 的格式化
6. plantuml: 支持 plantuml。[本地使用配合](https://plantuml.com/zh/download) 
```shell
brew install libtool 
brew link libtool 
brew install graphviz 
brew link --overwrite graphviz
```

```plantuml
@startuml
A -> B: Hello
@enduml
```
1. https://markdown.com.cn/editor/ - 发布到微信公众号
	1. https://doocs.github.io/md/
2. [[3ab Spaced Repetition]]: 做定期复习的工具
3. Nature Language Dates: 方便写日期
4. auto upload image: # Obsidian Image Auto Upload Plugin
	1. https://github.com/Molunerfinn/PicGo/releases/tag/v2.3.1
	2. github Token: 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
	3. picgo 安装失败，使用 [picgo core](https://picgo.github.io/PicGo-Core-Doc/zh/guide/getting-started.html#%E5%85%A8%E5%B1%80%E5%AE%89%E8%A3%85)：`npm install picgo -g`
	4. SMMS Token: zxbmBatkVCdcWcSdWtv8obCh2QTTZ4xC  - https://smms.app/
	5. 使用手动上传的方式，减少变化
5. 发现微信支持 doc 文件，找到新的插件：pandoc + pandoc plugin
6. **periodic notes**：周期性的文档，每日/每周/每月/每 Q/每年
7. plaintext：将 html 加上，就可以编辑 html 文件了。
8. linter: 有一些文本自动处理的地方就自动做了，比如中英文之间添加空格。
9. 自动文本生成：Obsidian Text Generator Plugin , key = `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`
```javascript
// 清除没法登陆openai
window.localStorage.removeItem(Object.keys(window.localStorage).find(i=>i.startsWith('@@auth0spajs')))
```

# 基础用法


这个插入搜索的能力还是挺强的。感觉不错。
```query
记录
sort: modified
```


```query
task:("内容")
```
正在认真学习 obsidian 的中文文档：[中文文档](https://publish.obsidian.md/help-zh/%E6%8F%92%E4%BB%B6/%E6%90%9C%E7%B4%A2)

尝试一下任务列表
- [ ] 这是一个任务

不知道不连起来是什么样的
- [x] 这是另一个任务
- [?] 看看这个内容

之前还么有试过==高亮==
也可以试试添加脚注 [^脚注 1]，再试试其他脚注 [^1]
脚注 [^1]
[^1]: 这是很有用的
[^脚注 1]: 这是另一个有用的点


H 脚注的用法很简单，只需要在段落中需要插入脚注的地方标注一个符号，再在段落后对这个符号进行解释即可。比如这是一个简单的脚注，[^1] 这是一个长一些的脚注。[^长脚注] 
[^1]: 很有用！ 
[^长脚注]: 这是一个可以写长段落或者代码的地方。 你可以使用缩进在脚注中纳入其他段落。 `{ 代码 }` 这样你就可以在脚注中添加任意数量的段落了。


# 但是应该在哪里展示脚注呢？





---

```plantuml
A -> B: 你好
B -> A: 你也好
```


```mermaid
sequenceDiagram

A -->>+ B: Hello
B -->>+ A: Fuck off
```


![[单纯记录#^2424ce]]

![[单纯记录#长期稳定]]


![[单纯记录#^test]]

