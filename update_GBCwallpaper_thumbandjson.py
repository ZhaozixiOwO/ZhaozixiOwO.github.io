import os
import re
import json
import math
from io import BytesIO
from PIL import Image, ImageOps

# ============================================================
# 依赖：
#   pip install pillow
#
# 说明：
#   这个脚本会在 ./assets/images 里为原图生成同分辨率的 WebP 压缩版：
#     4kgbc-1.png  ->  4kgbc-1-web.webp
#
#   JSON 会改为引用新的 -web.webp 文件名。
#   JS 也需要配套修改为“直接读取 JSON 里的文件名”，不要再自己猜 .png/.jpg。
#
#   如果你的仓库本身超尺寸，确认压缩图画质没问题后，可以把
#   REMOVE_ORIGINAL_AFTER_SUCCESS 改成 True，或手动删除旧的 png/jpg 原图。
# ============================================================

# 原图目录：保持不动
image_dir = './assets/images'

# JSON 输出路径：保持不动
json_filename = '4kgbc-wallpapers.json'

# 支持处理的原图后缀
valid_extensions = ('.jpg', '.jpeg', '.png', '.webp')

# 新压缩图命名：4kgbc-1.png -> 4kgbc-1-web.webp
output_suffix = '-web'
output_extension = '.webp'

# 压缩目标：尽量压到原文件 50% 及以下
target_size_ratio = 0.50

# 画质范围：
# max_quality 越高画质越好，体积越大
# min_quality 是优先保持画质的下限
# aggressive_min_quality 是为了尽量达成 50% 体积目标的兜底下限
max_quality = 88
min_quality = 60
aggressive_min_quality = 45

# 是否强制重新压缩已经存在的 -web.webp
force_recompress = False

# ！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！！
# 是否压缩成功后删除原图
# 第一次建议保持 False，确认效果后再改 True。
# 注意：如果保持 False，仓库里会同时存在原图和压缩图，仓库总大小不会下降。
remove_original_after_success = True


def natural_key(s: str):
  """自然排序：把字符串中的数字按数值比较"""
  return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]


def is_valid_image_file(filename: str) -> bool:
  path = os.path.join(image_dir, filename)
  return (
    filename.lower().endswith(valid_extensions)
    and not filename.startswith('.')
    and os.path.isfile(path)
  )


def is_generated_web_file(filename: str) -> bool:
  """判断是否是本脚本生成的压缩图，避免二次套娃压缩"""
  name, ext = os.path.splitext(filename)
  return ext.lower() == output_extension and name.lower().endswith(output_suffix.lower())


def optimized_filename(filename: str) -> str:
  name, _ = os.path.splitext(filename)
  return f'{name}{output_suffix}{output_extension}'


def has_alpha(img: Image.Image) -> bool:
  return (
    img.mode in ('RGBA', 'LA')
    or (img.mode == 'P' and 'transparency' in img.info)
  )


def prepare_image(img: Image.Image) -> Image.Image:
  """
  不改变分辨率，只做方向修正和色彩模式转换。
  ImageOps.exif_transpose 不会缩放图片，只会按 EXIF 方向正确摆放。
  """
  img = ImageOps.exif_transpose(img)

  if has_alpha(img):
    return img.convert('RGBA')

  if img.mode != 'RGB':
    return img.convert('RGB')

  return img


def encode_webp(img: Image.Image, quality: int, icc_profile=None) -> bytes:
  buffer = BytesIO()

  save_kwargs = {
    'format': 'WEBP',
    'quality': quality,
    'method': 6,          # Pillow/WebP 里最慢但压缩效果最好的档位
    'lossless': False,
  }

  if img.mode == 'RGBA':
    # 尽量保留透明边缘质量；壁纸一般没有透明通道，但这里兼容一下
    save_kwargs['alpha_quality'] = 90
    save_kwargs['exact'] = True

  if icc_profile:
    save_kwargs['icc_profile'] = icc_profile

  img.save(buffer, **save_kwargs)
  return buffer.getvalue()


def choose_best_webp_bytes(img: Image.Image, original_size: int, icc_profile=None):
  """
  从高质量到低质量尝试，优先选择：
  1. 能压到原文件 50% 以内；
  2. 在满足体积目标的前提下质量尽可能高；
  3. 如果实在压不到 50%，选择体积最小的候选，并打印警告。
  """
  target_size = max(1, int(original_size * target_size_ratio))
  candidates = []

  qualities = list(range(max_quality, min_quality - 1, -4))
  qualities += list(range(min_quality - 1, aggressive_min_quality - 1, -4))

  # 去重，保持顺序
  seen = set()
  qualities = [q for q in qualities if not (q in seen or seen.add(q))]

  for quality in qualities:
    data = encode_webp(img, quality, icc_profile=icc_profile)
    candidates.append((quality, data))

    if len(data) <= target_size:
      return quality, data, True

  # 没有任何质量档能达到 50%，选择体积最小的那个
  quality, data = min(candidates, key=lambda item: len(item[1]))
  return quality, data, False


def collect_image_files():
  all_files = sorted(
    [f for f in os.listdir(image_dir) if is_valid_image_file(f)],
    key=natural_key
  )

  source_files = [f for f in all_files if not is_generated_web_file(f)]
  generated_files = [f for f in all_files if is_generated_web_file(f)]

  return source_files, generated_files


def compress_one_image(filename: str):
  input_path = os.path.join(image_dir, filename)
  output_name = optimized_filename(filename)
  output_path = os.path.join(image_dir, output_name)

  if (
    os.path.exists(output_path)
    and not force_recompress
    and os.path.getmtime(output_path) >= os.path.getmtime(input_path)
  ):
    print(f'✅ 已存在，跳过压缩：{output_name}')
    return output_name, True

  original_size = os.path.getsize(input_path)

  try:
    with Image.open(input_path) as img:
      original_resolution = img.size
      icc_profile = img.info.get('icc_profile')
      prepared = prepare_image(img)

      quality, webp_bytes, reached_target = choose_best_webp_bytes(
        prepared,
        original_size,
        icc_profile=icc_profile
      )

    with open(output_path, 'wb') as f:
      f.write(webp_bytes)

    # 验证分辨率是否保持
    with Image.open(output_path) as check_img:
      new_resolution = check_img.size

    new_size = os.path.getsize(output_path)
    ratio = new_size / original_size if original_size else 0
    status = '达标' if reached_target else '未达 50%，已尽量压缩'

    if new_resolution != original_resolution:
      print(f'⚠️ 分辨率变化：{filename} {original_resolution} -> {new_resolution}')
    else:
      print(
        f'🗜️ {filename} -> {output_name} | '
        f'{original_size / 1024 / 1024:.2f}MB -> {new_size / 1024 / 1024:.2f}MB | '
        f'{ratio:.1%} | q={quality} | {status}'
      )

    if remove_original_after_success and os.path.exists(output_path):
      os.remove(input_path)
      print(f'🧹 已删除原图：{filename}')

    return output_name, True

  except Exception as e:
    print(f'❌ 处理失败 {filename}：{e}')
    return filename, False


def build_groups(image_files):
  image_count = len(image_files)
  total_image_count = int(math.ceil(image_count / 10.0) * 10) if image_count else 0

  groups = []

  for i in range(0, total_image_count, 10):
    group_images = image_files[i:i + 10]

    if len(group_images) < 10:
      group_images += [None] * (10 - len(group_images))

    group_number = (i // 10) + 1
    group_label = f'{i + 1}-{i + 10}'

    groups.append({
      'groupLabel': group_label,
      'groupNumber': group_number,
      'images': group_images
    })

  return {
    'groups': groups,
    'totalImageCount': total_image_count
  }


def main():
  if not os.path.isdir(image_dir):
    raise FileNotFoundError(f'图片目录不存在：{image_dir}')

  source_files, generated_files_before = collect_image_files()

  final_files = []

  if source_files:
    print(f'🔎 找到 {len(source_files)} 张待处理原图。')

    for filename in source_files:
      output_name, success = compress_one_image(filename)
      final_files.append(output_name if success else filename)

  else:
    print('ℹ️ 没有找到未压缩原图，将直接使用现有的 -web.webp 文件生成 JSON。')

  # 重新扫描一次，确保把已有或刚生成的 -web.webp 都纳入 JSON
  _, generated_files_after = collect_image_files()

  # 如果原图已删除，或者某些 -web.webp 是之前生成的，也要保留在 JSON 里
  for filename in generated_files_after:
    if filename not in final_files:
      final_files.append(filename)

  final_files = sorted(set(final_files), key=natural_key)

  json_data = build_groups(final_files)
  json_path = os.path.join(image_dir, json_filename)

  with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(json_data, f, indent=2, ensure_ascii=False)

  actual_count = len(final_files)
  padded_count = json_data['totalImageCount']

  print(f'\n📦 成功生成 JSON：{json_path}')
  print(f'🧾 JSON 当前引用 {actual_count} 张图片，补齐显示数量为 {padded_count}。')
  print(f'🏷️ 新命名示例：4kgbc-1.png -> 4kgbc-1-web.webp')


if __name__ == '__main__':
  main()
