# XBoard 测试环境快速部署（Docker）

本指南用于 **全新测试机** 快速拉起 `xboard-shulai`，并切换到 `sloth-portal` 前台主题。

## 1. 准备

- 系统：Ubuntu 22.04+（推荐）
- 已安装：Docker、Docker Compose Plugin、Git
- 开放端口：`7002`（或你自定义的端口）

## 2. 拉取源码（必须带 submodule）

```bash
cd /opt
rm -rf xboard-test
git clone --recurse-submodules https://github.com/shulaiyun/xboard-shulai.git xboard-test
cd /opt/xboard-test
```

如果你已经克隆过，但没带子模块：

```bash
cd /opt/xboard-test
git submodule sync --recursive
git submodule update --init --recursive
```

## 3. 生成 compose 配置

```bash
cp compose.sample.yaml compose.yaml
sed -i 's/--port=7001/--port=7002/g' compose.yaml
```

## 4. 安装依赖并初始化

先安装 PHP 依赖（避免 `vendor/autoload.php` 报错）：

```bash
docker compose run --rm web composer install --no-dev --optimize-autoloader
```

首次安装（SQLite + Redis 测试配置）：

```bash
docker compose run --rm \
  -e ENABLE_SQLITE=true \
  -e ENABLE_REDIS=true \
  -e ADMIN_ACCOUNT=admin@test.com \
  web php artisan xboard:install
```

## 5. 启动服务

```bash
docker compose up -d
docker compose ps
```

## 6. 切换前台主题为 sloth-portal

> 不要手动只改 `current_theme`，应调用 ThemeService 切换。

```bash
cd /opt/xboard-test
docker compose exec web php artisan tinker --execute="app(\App\Services\ThemeService::class)->switch('sloth-portal'); admin_setting(['frontend_theme'=>'sloth-portal']);"
docker compose exec web php artisan optimize:clear
docker compose restart web horizon
```

## 7. 检查是否成功

```bash
curl -i http://127.0.0.1:7002/
curl -i http://127.0.0.1:7002/api/v1/guest/plan/fetch
curl -i "http://127.0.0.1:7002/api/v1/guest/notice/fetch?current=1&page_size=3"
ls -la /opt/xboard-test/theme/sloth-portal
ls -la /opt/xboard-test/public/theme/sloth-portal
ls -la /opt/xboard-test/public/assets/admin
```

## 8. 常见问题

### 8.1 `Theme not found`

根因通常是源码里没有 `theme/sloth-portal`（旧 zip 或未同步新仓库）。

处理：
1. 确认当前目录是 `xboard-shulai` 最新代码；
2. 执行 `git pull`；
3. 确认 `theme/sloth-portal` 存在后再执行主题切换命令。

### 8.2 管理端白屏

最常见根因是没初始化 `public/assets/admin` 子模块。

```bash
git submodule update --init --recursive
docker compose exec web php artisan optimize:clear
docker compose restart web horizon
```

### 8.3 前台只有登录页（不是 sloth-portal）

```bash
docker compose exec web php artisan tinker --execute="echo 'frontend_theme=' . admin_setting('frontend_theme', 'Xboard') . PHP_EOL; echo 'current_theme=' . admin_setting('current_theme', 'null') . PHP_EOL;"
```

如果不是 `sloth-portal`，重新执行第 6 步。

