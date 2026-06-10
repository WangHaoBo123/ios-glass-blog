# 1.宇宙的中心是 PHP
## 方法一
考察bp抓包

![image](./assets/uploads/new-post-1781098986847-1.webp)

![image](./assets/uploads/new-post-1781099018167-1.webp)

```
document.oncontextmenu = function(){
    return false; //禁用右键菜单
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
        e.preventDefault(); //禁用f12
    }
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault(); //禁用ctrl u
    }
});
```

这段js代码主动禁止了查看前端

```
<?php
highlight_file(__FILE__);
include "flag.php";
if(isset($_POST['newstar2025'])){
    $answer = $_POST['newstar2025'];
    if(intval($answer)!=47&&intval($answer,0)==47){
        echo $flag;
    }else{
        echo "你还未参透奥秘";
    }
}
```

intval函数用于获取整数，把47转换为八进制数057即可

## 方法二
edge存在一个神奇bug，直接快捷键ctrl E 聚焦搜索 然后就能绕过前端js限制进行ctrl U了
后面方法一样。