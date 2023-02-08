- [mockit essential.pdf](files/mockito%20essentials.pdf)
- [# 书评：Mockito Essentials](https://blog.csdn.net/dnc8371/article/details/106703871) 
	- mockito wiki : https://github.com/mockito/mockito/wiki
	- Understanding the Mockito architecture 作者列了一下
- mockit的官方文档： https://javadoc.io/static/org.mockito/mockito-core/5.1.1/org/mockito/Mockito.html
- 
- 
# 文档
1. verify(a).b(): 验证调用过a.b()
2. when(mockedList.get(0)).thenReturn("first");   mock返回值
3. `when(mockedList.contains(argThat(someString -> ((String) someString).length() > 5))).thenReturn(true);` 可以增加参数判断。
```java
// stubbing void methods with exceptions  
doThrow(new RuntimeException()).when(mockedList).clear();  
mockedList.clear();


```