![[Pavlo_Yakubovskyi.pdf]]

## 开场白

Hi XXX, my name is XX, and YY is my colleague from the same backend development team. Nice to meet you at the interview meeting.

  

## 面试问题

  

1.  Hi XXX, could you plz introduce yourself, focus on the latest few years experiences.
    
2.  What was the most challenging task in your past jobs?
    
3.  How to implement A/B test? What is the actual scenario?

4.  Could you please give an example to explain your data-driven approach?

5.  Can you introduce your team and your role in you team. 

6.  Could you share some tips on learning new technical stuff?

1.  Could you describe the most impressive production service down in your past jobs?

3.  Besides day-to-day work, what kind of techniques that interest you the most?

  
  

## 笔试题

笔试题使用： https://collabedit.com/qswfs

  

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