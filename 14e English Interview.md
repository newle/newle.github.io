![[Pavlo_Yakubovskyi.pdf]]

## 开场白

Hi XXX, my name is XX, and YY is my colleague from the same backend development team. Nice to meet you at the interview meeting.

  

## 面试问题

  

1.  Hi XXX, could you plz introduce yourself, focus on the latest few years experiences.
    
2.  What was the most challenging task in your past jobs?
    
3.  How to implement A/B test? What is the actual scenario?

4.  

5.  What kind of help did your mentor or partner offer that you consider most helpful?
    

候选人的印度口音太重了，语速也很快，这个问题实在没有get到太多信息。大致表达的内容，候选人在团队中是比较资深的技术人员，工作中更多承担类似mentor的角色。从后续问答中候选人展现出的技术能力和理解，能够得到一定的印证。

6.  Could you share some tips on learning new technical stuff?
    

这个问题本意是想了解候选人如何扩充自己的知识体系。但可能由于提问方式以及沟通上的gap，候选人回答时更多关注在对于一个陌生技术栈的项目，如何快速进入开发状态。候选人的答案是阅读项目文档，寻求必要的帮助，了解关键技术点进行针对性学习。

7.  Could you describe the most impressive production service down in your past jobs?
    

候选人介绍了过去项目中因为SSO异常造成的线上问题。对于互联网项目的稳定性保障，候选人整体思路比较清楚。问题定位、快速恢复服务、排障等动作的介绍，应该是有实际的应急响应经验，也符合主流互联网服务的实践思路。

8.  Besides day-to-day work, what kind of techniques that interest you the most?
    

Really focus on the front end.

候选人主要介绍了前端相关的学习。方向比较集中，对于泛技术领域的宽度拓展，相对少一点

9.  Mem leak example.
    

因为所有数据都放在redux，所以有一次数据在页面关闭时没有正常清除，导致用户早上打开的时候很流畅，用到晚上就非常卡顿。本地复现，把heap dump下来分析后，得出了出问题的地方，进行了修复。

  

这个题回答蛮不错的

  

  

## 笔试题

笔试题使用： https://collabedit.com/375qr

  

1.  Recursive JSON Serializer
    

```JavaScript
// create your own JSON.stringify function, can serialize json object into json string. 


const sampleJSONObject = {
  foo: 'bar',
  boolKey: true,
  innerObject: {
    num1: 1,
    arr2: [1, 2, 3, {deep: true}]
  }
}

// output: 
// {"foo": "bar", "boolKey": true, "innerObject": {"num1": 1, "arr2": [1, 2, 3, {"deep": true}]}}



function stringify(node){
    let res ='';
    if(typeof node =='object'){
     res=res+'{';
        for(const key in jsonObject){
            const value = jsonObject[key];
             
             const valuesString = stringify(value);
             const objString = '"${key}":${valuesString}';
               
             
             res= res +','+objString;
              }  
          res="}";
      return res;        
    }else if(typeof node =='array'){
     res=res+'[';
        for(const value of jsonObject){
             
             const valuesString = stringify(value);
               
             res= res +','+valuesString;
        }
       res="]";
      return res; 
    }else if(typeof node =='fucntion'){
        throw new Error('');
    } else {
    return node;
    
    }
}


/**
 serialize json object into json string. 
 @param {Object} jsonObject
 @returns {String}
**/
function myOwnJSONStringify(jsonObject) {
    if(typeof jsonObject =='function'){
        return false;
    }
    
    let res ='';
    
    
     
        
    // can code here
}
```

笔试题是最近看到做的最好的一个，基本能达到国内招聘的bar。

候选人在coding过程中也通过语音介绍自己的编码思路，可以看出来候选人对JSON的技术标准还是比较了解，一些边界和异常case都有考虑到。整体编码的模式也比较规范。不过可能因为日常使用框架较多，原生 js 的一些语法细节有错漏。

## 公司介绍

NIO is a global electric car manufacturer, and we have offices in Beijing and Shanghai China, Munich Germany, Oslo Norway, Amsterdam Netherlands and San Jose USA. Currently we are going into EU markets and just launched our 3 new cars in Berlin.