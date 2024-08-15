- 通过go xx，来启动协程。 
- 通过 channel 来进行通信。 关键词是chan 。 写入和读取都是阻塞的。可以有一个比较大的缓冲区。使用 select 给 channel 赋予超时机制，防止程序锁死。 
```go
// 首先，我们实现并执行一个匿名的超时等待函数
timeout := make(chan bool, 1) 
go func() { 
 time.Sleep(1e9) // 等待1秒钟
 timeout <- true
}() 
// 然后我们把timeout这个channel利用起来
select { 
 case <-ch: 
 // 从ch中读取到数据
 case <-timeout: 
 // 一直没有从ch中读取到数据，但从timeout中读取到了数据
}
```
- 使用 select 来通过判断 channel 的状态，决定执行什么语句。
- 可以将特定的 channel 设置成单向 channel，这样保证每个使用方都是最小权限的。