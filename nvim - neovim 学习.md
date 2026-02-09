- 插件： nvchad - https://nvchad.com/docs/quickstart/install
- --- 2023-07-05 05:51 学不来，就想放弃
- 支持 init.vim 的方法： https://www.reddit.com/r/neovim/comments/zfimqo/is_it_possible_to_use_initvim_and_initlua_together/
```
You could rename the VimScript `init.vim` to something else (like `vimrc.vim`), and then have a `init.lua` with the following:

local vimrc = vim.fn.stdpath("config") .. "/vimrc.vim"
vim.cmd.source(vimrc)

This will effectively source both the init.lua and "init.vim".
```
