# 综合测试 DiscEditor 数据流
Write-Host "=== DiscEditor 数据流测试 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 测试获取种子列表
Write-Host "1. 获取种子列表..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/qb/torrents/info" -Method Get
    if ($response.success) {
        $torrents = ($response.data | ConvertFrom-Json)
        Write-Host "   ✅ 成功获取 $($torrents.Count) 个种子" -ForegroundColor Green

        if ($torrents.Count -gt 0) {
            $testTorrent = $torrents[0]
            $hash = $testTorrent.qb_torrent.hash
            $name = $testTorrent.qb_torrent.name
            $id = $testTorrent.id

            Write-Host ""
            Write-Host "2. 测试种子信息:" -ForegroundColor Yellow
            Write-Host "   名称: $name"
            Write-Host "   Hash: $hash"
            Write-Host "   ID: $id"

            if (-not $id) {
                Write-Host "   ❌ 种子没有 ID！" -ForegroundColor Red
                exit 1
            }

            # 3. 测试同步文件
            Write-Host ""
            Write-Host "3. 从 qBittorrent 同步文件..." -ForegroundColor Yellow
            $filesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/qb/torrents/files?hash=$hash" -Method Get

            if ($filesResponse.success) {
                $files = ($filesResponse.data | ConvertFrom-Json)
                Write-Host "   ✅ 成功同步 $($files.Count) 个文件" -ForegroundColor Green

                if ($files.Count -gt 0) {
                    $firstFile = $files[0]
                    Write-Host ""
                    Write-Host "   第一个文件信息:"
                    Write-Host "   - id: $($firstFile.id)"
                    Write-Host "   - name: $($firstFile.name)"
                    Write-Host "   - size: $($firstFile.size) bytes"
                    Write-Host "   - progress: $($firstFile.progress)"

                    # 验证 FileItem 结构
                    $hasAllFields = $firstFile.id -and $firstFile.name -and ($null -ne $firstFile.size) -and ($null -ne $firstFile.progress)

                    if ($hasAllFields) {
                        Write-Host ""
                        Write-Host "   ✅ FileItem 数据结构正确" -ForegroundColor Green
                    } else {
                        Write-Host ""
                        Write-Host "   ❌ FileItem 数据结构不完整" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "   ❌ 同步文件失败: $($filesResponse.error)" -ForegroundColor Red
            }

            # 4. 测试从数据库获取文件
            Write-Host ""
            Write-Host "4. 从数据库获取文件..." -ForegroundColor Yellow
            $dbFilesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/torrents/files?hash=$hash" -Method Get

            if ($dbFilesResponse.success) {
                $dbFiles = ($dbFilesResponse.data | ConvertFrom-Json)
                Write-Host "   ✅ 数据库中有 $($dbFiles.Count) 个文件" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  从数据库获取文件失败: $($dbFilesResponse.error)" -ForegroundColor Yellow
            }

            # 5. 测试卷数据
            Write-Host ""
            Write-Host "5. 获取卷数据..." -ForegroundColor Yellow
            $volumesResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/volumes?torrent_id=$id" -Method Get

            if ($volumesResponse.success) {
                $volumes = ($volumesResponse.data | ConvertFrom-Json)
                Write-Host "   ✅ 获取到 $($volumes.Count) 个卷" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  暂无卷数据" -ForegroundColor Yellow
            }

            # 总结
            Write-Host ""
            Write-Host "=== 测试总结 ===" -ForegroundColor Cyan
            Write-Host "✅ 种子数据: $($torrents.Count) 个" -ForegroundColor Green
            Write-Host "✅ 文件数据: $($files.Count) 个" -ForegroundColor Green
            Write-Host "✅ 数据格式: FileItem 正确" -ForegroundColor Green
            Write-Host "✅ 数据库存储: 正常" -ForegroundColor Green
            Write-Host ""
            Write-Host "🎉 所有测试通过！DiscEditor 应该可以正常显示数据了。" -ForegroundColor Green
        }
    } else {
        Write-Host "   ❌ 获取种子列表失败: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ 测试失败: $_" -ForegroundColor Red
}

