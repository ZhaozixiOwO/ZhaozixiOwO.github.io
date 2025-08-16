import os
import re
import json
import math
from PIL import Image

# 原图目录和缩略图目录
image_dir = './assets/images'
thumb_dir = os.path.join(image_dir, 'thumbnail')

# 创建缩略图文件夹（如果不存在）
os.makedirs(thumb_dir, exist_ok=True)

# 支持的图片后缀
valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')

# 自然排序：把字符串中的数字按数值比较
def natural_key(s: str):
  return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

# 获取原图列表（过滤缩略图和隐藏文件）+ 自然排序
image_files = sorted([
  f for f in os.listdir(image_dir)
  if f.lower().endswith(valid_extensions)
  and not f.startswith('.')
  and not os.path.isdir(os.path.join(image_dir, f))
], key=natural_key)

# 缩略图参数
thumb_width = 1920  # 可按需调整

# 遍历图片生成缩略图
for filename in image_files:
  name, ext = os.path.splitext(filename)
  thumb_path = os.path.join(thumb_dir, f'{name}-thumb.jpg')

  if os.path.exists(thumb_path):
    print(f'✅ 缩略图已存在，跳过：{thumb_path}')
    continue

  try:
    img_path = os.path.join(image_dir, filename)
    with Image.open(img_path) as img:
      # 按目标宽度等比缩放（避免把原高塞进去影响长宽比）
      ratio = thumb_width / float(img.width)
      new_size = (thumb_width, max(1, int(img.height * ratio)))
      img = img.resize(new_size, Image.LANCZOS)
      img.convert("RGB").save(thumb_path, "JPEG")
      print(f'🖼️ 生成缩略图：{thumb_path}')
  except Exception as e:
    print(f'❌ 处理失败 {filename}：{e}')

# 计算图片数量并补齐到十的倍数（用于统计显示）
image_count = len(image_files)
total_image_count = int(math.ceil(image_count / 10.0) * 10)

# 按 10 张一组分组，并加标号（不足 10 张用 None 占位，方便前端固定栅格）
groups = []
for i in range(0, total_image_count, 10):
  group_images = image_files[i:i+10]
  if len(group_images) < 10:
    group_images += [None] * (10 - len(group_images))  # 如不想补齐，删掉这行

  group_number = (i // 10) + 1
  group_label = f"{i+1}-{i+10}"

  groups.append({
    "groupLabel": group_label,    # 例：1-10
    "groupNumber": group_number,  # 例：1
    "images": group_images        # 例：["...1.png", "...2.png", ... , None]
  })

# 输出到 JSON 文件
json_data = {
  "groups": groups,
  "totalImageCount": total_image_count
}
json_path = os.path.join(image_dir, '4kgbc-wallpapers.json')
with open(json_path, 'w', encoding='utf-8') as f:
  json.dump(json_data, f, indent=2, ensure_ascii=False)

print(f'\n📦 成功生成 JSON：{json_path}（共 {image_count} 张原图，补齐到 {total_image_count}）')