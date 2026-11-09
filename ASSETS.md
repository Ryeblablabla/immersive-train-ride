# 资源来源与使用方式

## 地形与航拍影像

- **SWISSIMAGE，© swisstopo**：[产品](https://www.swisstopo.admin.ch/en/orthoimage-swissimage-10) · [免费地理数据使用条款](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)。官方说明允许各用途免费使用，并要求标注来源。项目将公开 WMTS 瓦片拼为 4096×4096 本地影像，与高程坐标对齐；照片导出包含来源标注。瓦片范围和处理说明见 public/assets/terrain/orthophoto-source.json。
- **高程**：[Mapzen / AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)，Terrarium 格式。项目采样瑞士阿尔卑斯地形并进行尺度重组、铁路切坡和河湖塑形；地图坐标与实际路线不完全一致。见 public/assets/terrain/source.json。

## Poly Haven

下列模型、材质和 HDR 均从 [Poly Haven](https://polyhaven.com/) 下载，采用 [CC0 1.0](https://polyhaven.com/license)。模型经过 Meshoptimizer / glTF Transform 处理，部分枝叶减量；高低细节版本为本项目派生文件，不代表原始扫描的全部面数。

| 用途 | 原始资源 |
|---|---|
| 岩壁 | [Coastal Cliff 01](https://polyhaven.com/a/coastal_cliff_01)、[02](https://polyhaven.com/a/coastal_cliff_02)、[Rock Face 02](https://polyhaven.com/a/rock_face_02) |
| 峡谷岩壁与花岗岩 | [Mountainside](https://polyhaven.com/a/mountainside)、[Namaqualand Cliff 02](https://polyhaven.com/a/namaqualand_cliff_02) |
| 湖岸与苔石 | [Coast Line 02](https://polyhaven.com/a/coast_line_02)、[Rock Moss Set 01](https://polyhaven.com/a/rock_moss_set_01) |
| 树木 | [Tree Small 02](https://polyhaven.com/a/tree_small_02)、[Island Tree 02](https://polyhaven.com/a/island_tree_02)、[Fir Tree 01](https://polyhaven.com/a/fir_tree_01) |
| 植物 | [Periwinkle Plant](https://polyhaven.com/a/periwinkle_plant)、[Nettle Plant](https://polyhaven.com/a/nettle_plant) |
| 地形表面 | [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock)、[Aerial Rocks 04](https://polyhaven.com/a/aerial_rocks_04)、[Cliff Side](https://polyhaven.com/a/cliff_side) |
| 扫描道具 | [Vintage Suitcase](https://polyhaven.com/a/vintage_suitcase)、[Vintage Electric Kettle](https://polyhaven.com/a/vintage_electric_kettle)、[Painted Wooden Bench](https://polyhaven.com/a/painted_wooden_bench) |
| 车内与铁路材质 | [Brown Leather](https://polyhaven.com/a/brown_leather)、[Wood Table Worn](https://polyhaven.com/a/wood_table_worn)、[Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02)、[Gravel](https://polyhaven.com/a/gravel)、[Grass Ground](https://polyhaven.com/a/grass_ground) |
| 可见天空、环境照明与反射 | [Belfast Sunset Pure Sky](https://polyhaven.com/a/belfast_sunset_puresky) |

远树图集由三种树资产的官方透明渲染图构成四个外观变体，其中一棵杉树翻转并调色。近树使用实际三维网格。文件名 ferns 对应的资源为 Nettle Plant（荨麻），并非蕨类。

清单见 public/assets/credits.json、landscape-credits.json、forest-credits.json、ground-credits.json；模型面数和文件大小见 landscape-manifest.json。研究阶段下载的 Shudu Lake 与 Drakensberg HDR 未在成品中使用。

## 渲染与自制部分

水面采用 Three.js 官方 Water；法线贴图来自 [Three.js 官方仓库](https://github.com/mrdoob/three.js/blob/dev/examples/textures/waternormals.jpg)，遵循仓库 MIT 许可。Three.js、Vite、glTF Transform、Meshoptimizer 许可见各包附带的 LICENSE。

车厢、车站、线路结构、简化人物、草叶、粒子和界面由本项目制作。声景主要为程序合成；可用时广播使用系统中文语音。未使用电影画面、台词、配乐或演员肖像。
