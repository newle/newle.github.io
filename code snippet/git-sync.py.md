- description: sync master branch of 
- run: `python3 git-sync.py`
- code:
```python
#!/usr/bin/python3
# *-* encoding: utf-8

import requests
import gitlab
import os

cfg = {
    "active_path": "/Users/zhen.wang/source/sync",
    "gitlab": {
        "url": 'https://git.nevint.com/',
        "token": 'zBMLWtyR1ZDLeb4rWnVf'
    },
    "groups_file": "groups.json",
    "sync_groups_to_project_file": "sync_groups_to_project.json",
    "sync_groups_prefix": ["marco-polo"]
}

#    "sync_groups_prefix": ["adops" ,"ai-platform-fe" ,"ais-engine" ,"ais-service" ,"alpsplm" ,"artemis" ,"arthur" ,"asr" ,"automation" ,"bill" ,"bingwen" ,"box" ,"business-front" ,"clm" ,"common" ,"data-platform" ,"ddo-community-tb" ,"debug" ,"devops" ,"di.cai" ,"dialog-system" ,"digitaloperation" ,"do" ,"document" ,"dzq" ,"edm" ,"esb-projects" ,"feishu" ,"feng.liu7.o" ,"finance" ,"financeproject" ,"fpcs" ,"greatwall" ,"hao.lin" ,"hr" ,"hrwz" ,"idms" ,"iris" ,"leo.sun" ,"leopard" ,"lingyu.zhou.o" ,"logistics-platform" ,"marco-polo" ,"mars.yu" ,"mer" ,"metis" ,"mini-app" ,"mno" ,"moatkeeper" ,"monitor-platform" ,"mp" ,"ncc" ,"ncf" ,"neo" ,"new_people" ,"newpms" ,"newteam" ,"nio-content" ,"nio-rpt" ,"niohome" ,"nitp" ,"nrs" ,"nss" ,"ntp" ,"ot-meal" ,"pay" ,"pe" ,"people" ,"phoenix" ,"plm" ,"pmc" ,"publicplatform" ,"pulse-api" ,"pulse-report" ,"qmap" ,"quality-platform" ,"recomm" ,"recruiting" ,"sas" ,"scms" ,"scr" ,"sdi_android" ,"sdi_data" ,"settlement" ,"shadow" ,"shirasawa" ,"spaa" ,"speakout" ,"springcloud" ,"sqe_se" ,"store" ,"supertodo" ,"tairan.wang.o" ,"taxi" ,"tis" ,"tool" ,"uad" ,"ucg" ,"ucs" ,"uds" ,"vau" ,"vau-shc" ,"vinbom-cn" ,"vinbom-eu" ,"vom" ,"vrs" ,"xile.su" ,"ying.sun1" ,"yuqi.liu" ,"zion", "automation"
#    ]
#}

import json
def updateGroupsAndReturn(gl, goupsFile):
    savedGroups = {}
    try:
        with open(goupsFile, "r") as json_file:
            savedGroups = json.load(json_file)
    except Exception:
        pass

    page = 1
    notFinished = True

    while notFinished:
        print("get group of page: " + str(page))
        groups = gl.groups.list(order_by = "id", sort = "desc", page = page)
        if not groups or len(groups) == 0:
            break

        for group in groups:
            if str(group.id) in savedGroups:
                notFinished = False
                break
            savedGroups[str(group.id)] = {
                'id': str(group.id),
                'full_path': group.full_path,
                'name': group.name,
                'parent_id': group.parent_id,
                'web_url': group.web_url
            }

        page += 1

    with open(goupsFile, "w") as json_file:
        json.dump(savedGroups, json_file,sort_keys=True, indent=4)

    return savedGroups

def updateGroup2Projects(gl, group, savedGroups2Projects):
    projects = []
    if group['full_path'] in savedGroups2Projects:
        projects = savedGroups2Projects[group['full_path']]

    savedProjectsName = map(lambda x: x["name_with_namespace"], projects)

    ## update projects
    page = 1
    notFinished = True
    groupObject = gl.groups.get(group['id'])
    while notFinished:
        print("get projects in group " + str(group['full_path'].encode("utf-8")) + " of page: " + str(page))
        groupProjects = groupObject.projects.list(order_by = "id", sort = "desc", page = page)
        if not groupProjects or len(groupProjects) == 0:
            break

        for project in groupProjects:
            if project.name_with_namespace in savedProjectsName:
                notFinished = False
                break

            projects.append({
                'name': project.name,
                'name_with_namespace': project.name_with_namespace,
                'ssh_url_to_repo': project.ssh_url_to_repo
            })

        page += 1


    savedGroups2Projects[group['full_path']] = projects
    return projects

def updateGroups2Projects(gl, groups, groups2ProjectsFile):
    savedGroups2Projects = {}
    try:
        with open(groups2ProjectsFile, "r") as json_file:
            savedGroups2Projects = json.load(json_file)
    except Exception:
        pass

    if not groups or len(groups) == 0:
        return {}

    groups2Projects = {}
    for group in groups:
        groups2Projects[group['full_path']] = updateGroup2Projects(gl, group, savedGroups2Projects)

    with open(groups2ProjectsFile, "w") as json_file:
        json.dump(savedGroups2Projects, json_file,sort_keys=True, indent=4)

    return groups2Projects

def getMatchGroups(groups, prefixes):
    matchGroups = []
    for group_id in groups:
        group = groups[group_id]
        for prefix in prefixes:
            if group['full_path'].lower().find(prefix.lower()) == 0:
                matchGroups.append(group)
                break
    return matchGroups


def createPath(pathName):
    isExists = os.path.exists(pathName)
    if not isExists:
        os.makedirs(pathName)
        print("目录创建成功: " + str(pathName.encode("utf-8")))
    else:
        print("目录已存在: " + str(pathName.encode("utf-8")))

import subprocess
def cloneProject(groupFullPath, project):
    createPath(groupFullPath)
    if os.path.exists(groupFullPath + "/" + project['name']):
        print("git pull origin master : " + groupFullPath + "/" + project['name'])
        subprocess.call(['git', 'pull', 'origin', 'master'], cwd = groupFullPath + "/" + project['name'])
    else:
        print("git clone " + str(project['ssh_url_to_repo'].encode("utf-8")))
        subprocess.call(['git', 'clone', project['ssh_url_to_repo']], cwd = groupFullPath)

def cloneGroupProjects(group2Projects):
    for groupFullPath in group2Projects:
        for project in group2Projects[groupFullPath]:
            cloneProject(groupFullPath, project)


def main():
    gl = gitlab.Gitlab(cfg['gitlab']['url'], private_token=cfg['gitlab']['token'])
    gl.auth()

    # 1. 查找所有的group
    groups = updateGroupsAndReturn(gl, cfg['groups_file'])
    # 2. 找到我们想要的group
    syncGroups = getMatchGroups(groups, cfg['sync_groups_prefix'])
    # 3. 获取所有的project
    group2Projects = updateGroups2Projects(gl, syncGroups, cfg['sync_groups_to_project_file'])
    # 4. 按project拉去master的代码
    os.chdir(cfg['active_path'])
    cloneGroupProjects(group2Projects)

    # 5. 建文本索引：做成工具，随时可以更新。
    # 6. 通过正则表达式进行文本搜索的脚本

    pass






if __name__ == "__main__":
    main()
```