-  Quotation Entity
```JAVA
public class QuotationVO {  
    private Long id;  
    private String billCode;  
    private String regionName;  
    private String cityName;  
    private String buildingName;  
    
    private String supplierName;  
    private String categoryName;  
    private String categoryDetailName;  
    private String unitName;  
    private String price;  
    private String currencyCode;  
    
    private String quotationEffectiveDate;  
    private String reportEffectiveDate;  
    private String reportStatus;  
    
    private String contractNum;  
    private String taxRate;  
    private String companyName;  
    private String prLine;  
  
    private EmpVO empVO;  
    private String purchaserId;  
    private String purchaserName;  
}

public class EmpVO implements Serializable {  
  
    @ApiModelProperty(name = "employeeId", notes = "员工ID", example = "1")  
    private String employeeId;  
  
    @ApiModelProperty(name = "name", notes = "员工姓名", example = "张三")  
    private String name;  
  
    @ApiModelProperty(name = "employeeEnName", notes = "员工英文姓名", example = "san zhang")  
    private String employeeEnName;  
  
    @ApiModelProperty(name = "email", notes = "员工邮箱", example = "zhangsan@bytedance.com")  
    private String email;  
  
    @ApiModelProperty(name = "avatarUrl", notes = "员工头像地址", example = "地址")  
    private String src;  
  
    @ApiModelProperty(name = "department", notes = "员工所属部门", example = "财务")  
    private String department;
}
```

