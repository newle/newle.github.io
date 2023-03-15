# PlantUML 最佳实践

## 时序图 - 讲故事
```plantuml
group 借刀杀人
group 第一步
  A -> D: 借刀
  A -> C: 杀人
end

group 第二步
  A -> B: 报警
  B -> D: 根据凶器找到D
end
end


loop 1000 times
  D -> B: 各种解释
end
B -> A: 找到了最终的凶手
```

## 系统结构图 - 多系统分块
```plantuml
package "资源子系统" {
[专员管理系统 Oathkeeper] as OK
[服务中心管理SCMS] as SCMS
[电力资源管理系统 PowerHouse] as PowerHouse
}

package "调度系统" {
  [服务单管理SOM] as SOM
  [PE 服务单管理] as PE
[NSC Schedule] as NSC
}

package "代客服务业务" {
  [专员管理系统 WEB ] as IE
  [专员APP] as SAPP
  [专员端后台 Tibbers] as Tibbers
  
  IE -down-> OK
  
  SAPP --> Tibbers
  Tibbers --> PE
  Tibbers --> SOM
  Tibbers -down-> OK: 获取专员基础 / 排班信息
  
  SOM --> NSC : 调度请求
  PE --> NSC : 调度请求
  NSC -down-> OK
  NSC --> PowerHouse
  NSC -down-> SCMS: 查询可用资源
  NSC --> SCMS : 派单
}
```

## 数据流
```plantuml
title QDM的数据流

[现场机器设备] as machine
[特定服务器] as folder


machine ..> folder

cloud "QDM" {
  [QDM解析服务] as QDM_parser
  folder -left-> QDM_parser
}

database "QDM存储" {
  [sql_server]
  QDM_parser -down-> sql_server
}


database "存储" {
  [S3元数据存储] as s3
  [Meta数据存储] as db
}

cloud "offline" {
  [上传服务] as upload
  queue kafka
  
  machine -right-> upload: web/api
  upload -right-> s3: 1.存储
  upload -down-> kafka: 2. 通知上传完成
  upload -down-> folder: 3. 存放到QDM的文件夹

}

offline -right-> [court_clerk]: 上传历史记录

cloud "catia" {
  [标准件查询服务] as catia_search
}

cloud "online" {
  
  [解析服务] as parser
  kafka -right-> parser
  s3 -down-> parser
  parser -right-> db
  
  [检索服务] as search
  db --> search

  [统计服务] as stat
  db --> stat
  
  [告警分析服务] as analysis
  db --> analysis
  catia_search -left-> analysis
}


node "分析人员" {
  [WEB服务] as web
  search --> web
  stat --> web
  analysis --> web
}
```
