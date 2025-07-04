# Путь до архіву
$destination = "widget.zip"

# Видаляємо старий архів, якщо є
if (Test-Path $destination) {
    Remove-Item $destination
}

# Створюємо архів з папки 'app'
Compress-Archive -Path .\app\* -DestinationPath $destination

Write-Host " Archive created: $destination"