# 先从别的地方学习
* https://zhuanlan.zhihu.com/p/355997933
首先整理了mermaid能画哪些图：
1. 饼状图：使用pie做关键词，把饼画出来
2. 流程图：graph，把流程展示出来
3. 序列图：sequenceDiagram，把交互关系展示出来
4. 甘特图：gantt，把事情发生的时间段展示出来
5. 类图：classDiagram，把事物是什么，相互之间的关系展示出来
6. 状态图：stateDiagram？
7. 用户旅程图：journey?

# 示例
1. 饼状图
```mermaid
pie
title: 为什么想学习跳舞
"有趣": 50
"锻炼身体": 20
"思考": 30
```
2. 流程图
```mermaid
graph

默认方形
id[方形]
id2(圆边矩形)
id3([体育场形])
id4[[子程序形]]
id5[(圆柱形)]
id6((圆形))

id7{菱形}
id8{{六角形}}
id9[/平行四边形/]
id10[\反向平行四边形\]
id11[/梯形\]
id12[\反向梯形/]

```
3. 多重链
```mermaid
graph

A & B & X --> C & D

```
```
graph 
   A & B & X --> C & D
```


# mermaid 官网
1. 可以最简单的方式，无需编码。[Mermaid Live Editor](https://mermaid.live/)
2. 初学者只需看  [Overview for Beginners](https://mermaid-js.github.io/mermaid/#/./n00b-overview?id=overview-for-beginners)
3. 了解到 [JS Open Source Awards (2019)](https://osawards.com/javascript/#nominees)
4. 几种类型介绍
### [Flowchart](https://mermaid-js.github.io/mermaid/#/./flowchart?id=flowcharts-basic-syntax)
```mermaid
graph TD

A --> B;
B --> C;
A --> C;
A --> E;
C --> D;
```
### [Sequence diagram](https://mermaid-js.github.io/mermaid/#/./sequenceDiagram)
```mermaid
sequenceDiagram

participant Alice
participant John

Alice ->> John: Hello John. How are you!
Loop think for many times
	John ->> John: Who am I?
End

Note right of John: He is insane?

John ->> NoOne: Where are you?
NoOne -->> Alice: Where should I be?
Alice -->> NoOne: Hell.
NoOne ->> John: In the hell.

```

### [Gantt diagram](https://mermaid-js.github.io/mermaid/#/./gantt)
```mermaid
gantt

dateFormat YYYY-MM-DD
title 学习甘特图
excludes 2022-11-02

section A sec
Task 1 been completed: done, des1, 2022-10-29, 2022-11-01
Task 2 is Active: active, des2, after des1, 3d
Task 3 is Future task: des3, after des2, 1d
Future task too: des4, 2022-11-05, 2d

```
### [Class diagram](https://mermaid-js.github.io/mermaid/#/./classDiagram)
```mermaid
classDiagram

Class01 <|-- AveryLongClass : Cool
Class03 *-- Class04
Class05 o-- Class06
Class07 .. Class08
Class09 --> C2 : Where am i?
Class09 --* C3
Class09 --|> Class07
Class07 : equals()
Class07 : Object[] elementData
Class01 : size()
Class01 : int chimp
Class01 : int gorilla
Class08 <--> C2: Cool label

```

### [Git graph](https://mermaid-js.github.io/mermaid/#/?id=git-graph)
```mermaid

```


