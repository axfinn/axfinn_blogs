---
title: "一句话命令"
date: 2025-07-18T18:30:00+08:00
draft: false
tags: ["Sci", "Vscode", "Vue", "Qa"]
categories: ["技术"]
---

## 常用一句话命令

### 网络

监听端口：`netstat -tnple` ，如果没有安装软件包 `net-tools`

### LINUX系统排查

### 快速下载

### 数据库

数据库备份：

备份脚本：

```bash
#!/bin//bash
#

export NOW="$(date +"%Y-%m-%d")"
export DATA_DIR=backup
export DATA_DATABASE=dress
mysqldump --opt -uroot  -p'P@ssw0rd' -h'h2.jaxiu.cn' $DATA_DATABASE > $DATA_DIR/${DATA_DATABASE}_$NOW.sql
```

一句话 docker 命令：
`docker run -ti --name mysql_dump -v /root/x/scripts/mysql_backup.sh:/mysql_backup.sh -v /root/x/scripts/backup:/backup:rw mysql:5.7.16 ./mysql_backup.sh`

删除已有历史备份

`find $DATA_DIR/ -type f -name "*.sql" -mtime +7 -exec rm -rf {} \;`

数据库查询一句话命令

单引号引起来的起来的是命令
`docker run -ti --name mysql_t mysql:5.7.16 ' mysql -u root -proot -h 10.105.40.49 -e "show databases"' ; docker stop mysql_t;docker rm mysql_t;`

一句话命令开启http访问当前页面

`docker run -dti --name nginx_t -v /tmp/test:/usr/share/nginx/html -p 8080:80 nginx`

### linux 快捷命令
