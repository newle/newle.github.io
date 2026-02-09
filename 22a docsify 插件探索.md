# 插件列表
- 官方列表： https://github.com/docsifyjs/docsify/blob/develop/docs/plugins.md 
- 做了 CDN 的 plugin 列表： https://cdn.jsdelivr.net/npm/docsify/lib/plugins/
- emoji 表情支持：emoji
- 图片放大缩小：zoom-image
- 在所有的代码块上添加一个简单的 Click to copy：docsify-copy-code
- 搜索：search
- 备案：beian
- mermaid 支持：mermaid

# 代码示例
```html
<script>
        window.$docsify = {
            // 项目名称
            name: 'newle.cc',
            // 仓库地址，点击右上角的Github章鱼猫头像会跳转到此地址
            // repo: 'https://github.com/newle',
            // 侧边栏支持，默认加载的是项目根目录下的_sidebar.md文件
            loadSidebar: true,
            // 导航栏支持，默认加载的是项目根目录下的_navbar.md文件
            loadNavbar: true,
            // 封面支持，默认加载的是项目根目录下的_coverpage.md文件
            coverpage: true,
            // 最大支持渲染的标题层级
            maxLevel: 5,
            // 自定义侧边栏后默认不会再生成目录，设置生成目录的最大层级（建议配置为2-4）
            subMaxLevel: 4,
            // 小屏设备下合并导航栏到侧边栏
            mergeNavbar: true,
            // 搜索配置(url：https://docsify.js.org/#/zh-cn/plugins?id=%e5%85%a8%e6%96%87%e6%90%9c%e7%b4%a2-search)
            search: {
                maxAge: 86400000,// 过期时间，单位毫秒，默认一天
                paths: 'auto',// 注意：仅适用于 paths: 'auto' 模式
                placeholder: '搜索',
                // 支持本地化
                placeholder: {
                    '/zh-cn/': '搜索',
                    '/': 'Type to search'
                },
                noData: '找不到结果',
                depth: 4,
                hideOtherSidebarContent: false,
                namespace: '',
            },
            beian: {
              ICP: "京备1234567",
              NISMSP: {
                number: "",
                url: "http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=12345678",
                id: ""
              },
            },
        };
        mermaid.initialize({ startOnLoad: true });
    </script>
    <!-- docsify的js依赖 -->
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/docsify.min.js"></script>
    <!-- emoji表情支持 -->
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/emoji.min.js"></script>
    <!-- 图片放大缩小支持 -->
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>
    <!-- 搜索功能支持 -->
    <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>
    <!--在所有的代码块上添加一个简单的Click to copy按钮来允许用户从你的文档中轻易地复制代码-->
    <script src="//cdn.jsdelivr.net/npm/docsify-copy-code/dist/docsify-copy-code.min.js"></script>
    <!--备案号支持:https://github.com/HerbertHe/docsify-beian-->
    <script src="//cdn.jsdelivr.net/npm/docsify-beian@latest/dist/beian.min.js"></script>
    <!--support mermiad: https://github.com/Leward/mermaid-docsify -->
    <script src="//unpkg.com/mermaid/dist/mermaid.js"></script>
	<script src="//unpkg.com/docsify-mermaid@latest/dist/docsify-mermaid.js"></script>
```



## 中文解释
- 调研 docsify 插件: https://www.jianshu.com/p/194e3fa76b51
- https://docsify.js.org/#/zh-cn/plugins?id=gitalk
- 