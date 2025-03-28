# 先从别的地方学习
* https://zhuanlan.zhihu.com/p/355997933
首先整理了 mermaid 能画哪些图：
1. 饼状图：使用 pie 做关键词，把饼画出来
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
2. 初学者只需看 [Overview for Beginners](https://mermaid-js.github.io/mermaid/#/./n00b-overview?id=overview-for-beginners)
3. 了解到 [JS Open Source Awards (2019)](https://osawards.com/javascript/#nominees) 
4. 几种类型介绍： 感觉最常用的是流程图和时序图

## 支持时序图
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
    gitGraph
       commit
       commit
       branch develop
       commit
       commit
       commit
       checkout main
       commit
       commit
```

### [Entity Relationship Diagram - 实验性质的](https://mermaid-js.github.io/mermaid/#/./entityRelationshipDiagram)

```mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
```
```mermaid
erDiagram
CAR ||--o{ NAMED-DRIVER : allows
CAR {
	string registrationNumber
	string make
	string model
}
PERSON ||--o{ NAMED-DRIVER : is
PERSON {
	string firstName
	string lastName
	int age
}
```

|Value(left)|Value(right)|Meaning|
|:--|:--|:--|
|\|o|o\||Zero or one|
|\|\||\|\||Exactly one|
|}o|o{|Zero or more|
|}\||\|{|One or more|

```
<first-entity> [<relationship> <second-entity> : <relationship-label>]

Example: PROPERTY ||--|{ ROOM : contains
```


### [User Journey Diagram](https://mermaid-js.github.io/mermaid/#/./user-journey)
```mermaid
journey

title 一天的心情

section 上班
骑自行车: 5: 我
学习: 6: 我
撕逼: 2: 我,敌人

section 下班
骑自行车: 4: 我
看书: 6: 我

```

# mysql 2 mermaid
一个脚本工具： https://github.com/KarnerTh/mermerd
- 下载 darwin 版本
* 请注意连接的语句
```yaml
connectionStringSuggestions:
  - postgresql://user:password@localhost:5432/yourDb
  - mysql://root:password@tcp(127.0.0.1:3306)/yourDb
  - sqlserver://user:password@localhost:1433?database=yourDb
```



- 可以直接用
```SHELL
# all parameters are provided via the interactive cli
mermerd

# same as previous one, but show all constraints even though the table of the resulting constraint was not selected
mermerd --showAllConstraints

# ERD is created via the provided run config
mermerd --runConfig yourRunConfig.yaml

# specify all connection properties so that only the table selection is done via the interactive cli
mermerd -c "postgresql://user:password@localhost:5432/yourDb" -s public

# same as previous one, but use all available tables without interaction
mermerd -c "postgresql://user:password@localhost:5432/yourDb" -s public --useAllTables

# same as previous one, but use a list of tables without interaction
mermerd -c "postgresql://user:password@localhost:5432/yourDb" -s public --selectedTables article,article_label
```


