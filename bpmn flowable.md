# 简单了解

https://zhuanlan.zhihu.com/p/417014073?utm_id=0

与大多数故事一样，Flowable也是因为其与Activiti对未来规划的路线不认同而开辟了一条自己的道路。目前主流的工作流开源框架就是Activiti/Camunda/Flowable，它们都有一个共同的祖先jbpm。先是有了jbpm4，随后出来了一个Activiti5，Activiti5经过一段时间的发展，核心人员出现分歧，又分出来了一个Camunda。activiti5发展了4年左右，紧接着就出现了Flowable。

网关：互斥/并行/包容性
任务：用户/服务/接受/调用子任务


例如：Camel节点，Mule节点。他不仅有bpmn引擎，还有cmmn（案例管理模型），dmn（决策模型），content（内容管理），form（表单管理），idm（用户鉴权）等等，但这也间接导致了Flowable的包结构非常繁多，上手非常困难。

如果你单纯地想快速上手bpmn引擎，建议使用Activiti，如果你想做出花样繁多的工作流引擎，建议使用Flowable。
而Camunda（卡蒙达）则更加的轻巧灵活，他的初衷就是为开发人员设计的“小工具”，但我个人的感觉而言，Camunda从代码上看并没有Activiti和Flowable好，而且他的社区是最不活跃的一个（至少从国内的角度来看），所以不太建议使用（当然这带了很多个人主观感受，如有不同意见，欢迎讨论）。


