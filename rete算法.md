#flashcards 

- WIKI: https://en.wikipedia.org/wiki/Rete_algorithm
	- 1974  [Charles L. Forgy](https://en.wikipedia.org/wiki/Charles_Forgy "Charles Forgy") of [Carnegie Mellon University](https://en.wikipedia.org/wiki/Carnegie_Mellon_University "Carnegie Mellon University"),第一次发表。
	- 遍历所有规则太慢了。rete 快
	- 构造网络，每个结点都是一个 pattern，从 Root 到 Leaf 的结点，构造出一个 condition，
	- 结构上是一种广义的 [[trie 树]]
	- Rete算法具有以下主要特点::The Rete algorithm exhibits the following major characteristics <!--SR:!2023-02-28-13-48,6,250-->
		- It reduces or eliminates certain types of redundancy through the use of node sharing.
		- It stores partial matches when performing [joins](https://en.wikipedia.org/wiki/Logical_conjunction "Logical conjunction") between different fact types. This, in turn, allows production systems to avoid complete re-evaluation of all facts each time changes are made to the production system's working memory. Instead, the production system needs only to evaluate the changes (deltas) to working memory.
		- It allows for efficient removal of memory elements when facts are **retracted** from working memory.
- rete 算法： https://blog.csdn.net/goodjava2007/article/details/121989398
	- ![](note/files/Pasted%20image%2020230217125601.png)


# 单词
- 有向无环图::directed acyclic graphs <!--SR:!2023-02-23-13-33,1,230-->
	- DAG & Tree：DAG node have multiple parents， which means there would be multi pathway from leaf to root in DAG, but only 1 way in Tree.
- 