#!/bin/bash
# =========================
# git 同步脚本
# https://github.com/edk24/gitsync/blob/master/gitsync.sh
# Author: 余小波
# Date: 2020-01-09
# =========================


# 创建函数
function gitsync() {
  # 本地文件是否发生了改变
  is_change=$(git status -s)

  # 当前分支
  branch=$(git symbolic-ref --short -q HEAD)
  # remark
  if [ -n "$1" ]; then
      guser=$1
  else
      # git.user.name
      guser="$(git config user.name) update"
  fi

  if [ 0 -lt ${#is_change} ]; then
    git add .
    git commit -m "$guser"
    # pull
    result=$(git pull origin $branch)
    tmp=$(echo $result | grep "fix conflicts")
    if [ "$tmp" != "" ]; then
      echo "(ノ=Д=)ノ┻━┻ 合并冲突, 请手动解决后提交"
    else
      # 推送
      git push origin $branch
    fi
  else
    echo "本地没有改变, 正在从远程仓库同步代码. 请耐心等待 ╭(●｀∀´●)╯╰(●’◡’●)╮";
    result=$(git pull origin $branch)
    tmp=$(echo $result | grep "fix conflicts")
    if [[ "$tmp" != "" ]]; then
      echo "(ノ=Д=)ノ┻━┻ 合并冲突, 请手动解决后提交"
    fi
  fi
}



#cd ~/mobile/newle.github.io
echo "newle.github.io"
gitsync

echo "private_note"
# 目录note是否存在，存在则同步，不存在就初始化
if [ ! -d "note" ]; then
  git clone git@github.com:newle/private_note.git note
fi
cd note
gitsync


# 获取参数
# $1: sync_work
# sync_work 存在时， 同步work
sync_work=$1
if [ "$sync_work"d != "d" ]; then
  echo "work_note"
  # 目录work是否存在，存在则同步，不存在就初始化
  if [ ! -d "work" ]; then
    git clone git@git.nevint.com:wz-note/obsidian.git work
  fi
  cd work
  gitsync
fi


