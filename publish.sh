#!/bin/bash 
###
 # @Author: axfinn
 # @Date: 2025-04-03 17:32:31
 # @LastEditors: 和家豪 hejiahao01@bilibili.com
 # @LastEditTime: 2025-04-03 17:36:50
 # @FilePath: /axfinn_blogs/publish.sh
 # @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
### 
# 
hugo -D
rm -rf ../axfinn.github.io/*
cp -rp ./public/* ../axfinn.github.io/ 
cd ../axfinn.github.io/
git add .
git commit -m "fix: `date +%Y%m%d-%H%M`发布新文章"
git push -f origin master