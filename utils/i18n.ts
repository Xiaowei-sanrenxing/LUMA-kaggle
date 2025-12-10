

export type TranslationKey = keyof typeof translations.zh;

export const translations = {
  zh: {
    // Sidebar
    'tool.agent_batch.label': 'Agent 智造',
    'tool.agent_batch.desc': '全流程批量生产模式。一键整合模特选择、姿势控制与场景适配，自动化生成全套电商图。',
    'tool.fission.label': '姿势裂变',
    'tool.fission.desc': '单图裂变多姿态，一键生成全套展示图。支持上传骨架或选择预设姿势。',
    'tool.bg_swap.label': '场景重构',
    'tool.bg_swap.desc': '保持模特和服装不变，一键替换背景为商业摄影棚、自然风光或节日场景。',
    'tool.face_swap.label': 'AI 虚拟模特',
    'tool.face_swap.desc': '保留服装，自由更换模特的脸部、发型、肤色，适配全球不同市场。',
    'tool.fusion.label': '人台融合',
    'tool.fusion.desc': '上传人台图或Ghost假模图，自动生成真人模特穿戴效果。',
    'tool.extraction.label': '商品提取',
    'tool.extraction.desc': '上传手机拍摄或杂乱背景图，AI 智能识别并提取高清商品。',
    'tool.detail.label': '细节放大',
    'tool.detail.desc': '上传产品图，智能生成指定部位的高清特写图。',
    'tool.planting.label': '一键种草',
    'tool.planting.desc': '只需上传1张服装图，即可生成相同穿搭的“种草”展示图。',
    'tool.layer_management.label': '图层管理',
    'tool.layer_management.desc': '管理画布上的所有图层。',
    
    // Workflow Titles
    'wf.home': '欢迎使用',
    'wf.agent_batch': 'Agent 智造模式',
    'wf.face_swap': 'AI 虚拟模特',
    'wf.bg_swap': '场景重构',
    'wf.fission': '姿势裂变',
    'wf.fusion': '人台融合',
    'wf.creative': '创意生图',
    'wf.detail': '细节放大',
    'wf.extraction': '商品提取',
    'wf.planting': '一键种草',
    'wf.layer_management': '图层管理',
    'wf.subtitle': '配置参数以生成高质量电商素材',

    // Home Page
    'home.hero.title_p1': '让视觉素材',
    'home.hero.title_p2': '自我营销',
    'home.hero.subtitle': 'Visuals that Sell themselves.',
    'home.hero.desc': '无需摄影棚与模特，AI 智能生成高转化率电商大片。',
    'home.btn.start_agent': '启动 AI 智造',
    'home.btn.demo': '试用 Demo',
    'home.features.title': '专为现代电商打造',
    'home.features.subtitle': '全套 AI 工具流，替代传统摄影工作流。',
    'home.footer.desc': 'LUMA 是下一代电商 AI 视觉引擎。赋能品牌批量生产影棚级素材。',

    // General UI
    'ui.upload': '点击上传图片',
    'ui.upload.drag': '点击或拖拽上传图片',
    'ui.analyze': 'AI 智能分析内容',
    'ui.generate': '立即生成',
    'ui.generating': '生成中...',
    'ui.export': '导出',
    'ui.back_home': '返回首页',
    'ui.theme_toggle': '切换主题',
    'ui.lang_toggle': '切换语言',

    // Operation Panel Headers
    'op.upload_ref': '1. 上传参考图',
    'op.select_model': '2. 选择模特',
    'op.select_pose': '2. 选择姿势',
    'op.select_scene': '2. 选择场景',
    'op.select_style': '2. 选择风格',
    'op.prompt_label': '补充细节 (Optional)',
    'op.platform': '适用平台',
    'op.quantity': '生成数量',
    'op.resolution': '画质选择',
    'op.preview': '生成预览',

    // Buttons
    'btn.change': '更换',
    'btn.smart_enhance': 'AI 润色',
    
    // System Alerts & Errors
    'alert.pose_limit': '最多只能选择 12 个姿势',
    'alert.upload_product': '请先上传产品图',
    'alert.batch_confirm': '即将生成 {n} 张图片，数量较多可能需要几分钟。是否继续？',
    'alert.select_scene': '请至少选择一个场景风格',
    'alert.select_detail': '请至少选择一个放大部位',
    'alert.upload_skeleton': '请上传骨架图',
    'alert.upload_ref_garment': '请上传服装参考图',
    'alert.upload_mannequin': '请上传人台图/Ghost Mannequin图',
    'alert.upload_ref_product': '请上传商品参考图',
    'alert.upload_base': '请上传商品/模特底图',
    'alert.error': '生成出错: ',
  },
  en: {
    // Sidebar
    'tool.agent_batch.label': 'Agent Batch',
    'tool.agent_batch.desc': 'Full-process batch production. Integrates model selection, pose control, and scene adaptation.',
    'tool.fission.label': 'Pose Fission',
    'tool.fission.desc': 'One image to multiple poses. Generate a full set of display images instantly.',
    'tool.bg_swap.label': 'Scene Swap',
    'tool.bg_swap.desc': 'Keep model and outfit, swap background to studio, nature, or festive scenes.',
    'tool.face_swap.label': 'Virtual Model',
    'tool.face_swap.desc': 'Keep outfit, swap face, hair, and skin tone for global markets.',
    'tool.fusion.label': 'Mannequin Fusion',
    'tool.fusion.desc': 'Upload mannequin/ghost images, generate realistic human model fitting.',
    'tool.extraction.label': 'Product Extract',
    'tool.extraction.desc': 'Extract products from cluttered backgrounds to clean studio shots.',
    'tool.detail.label': 'Detail Shot',
    'tool.detail.desc': 'Generate high-definition close-up shots of specific parts.',
    'tool.planting.label': 'Social Seeding',
    'tool.planting.desc': 'Generate lifestyle "OOTD" shots from a single clothing image.',
    'tool.layer_management.label': 'Layers',
    'tool.layer_management.desc': 'Manage all layers on the canvas.',

    // Workflow Titles
    'wf.home': 'Welcome',
    'wf.agent_batch': 'Agent Batch Mode',
    'wf.face_swap': 'AI Virtual Model',
    'wf.bg_swap': 'Scene Reconstruction',
    'wf.fission': 'Pose Fission',
    'wf.fusion': 'Mannequin Fusion',
    'wf.creative': 'Creative Generation',
    'wf.detail': 'Detail Enhancement',
    'wf.extraction': 'Product Extraction',
    'wf.planting': 'Social Seeding',
    'wf.layer_management': 'Layer Manager',
    'wf.subtitle': 'Configure parameters for high-quality e-commerce assets',

    // Home Page
    'home.hero.title_p1': 'Visuals that',
    'home.hero.title_p2': 'Sell Themselves',
    'home.hero.subtitle': 'Next Gen E-commerce AI.',
    'home.hero.desc': 'Transform basic product photos into high-conversion editorial campaigns in seconds.',
    'home.btn.start_agent': 'Launch Agent',
    'home.btn.demo': 'Try Demo',
    'home.features.title': 'Built for Modern Commerce',
    'home.features.subtitle': 'A complete suite of tools to replace your entire photography workflow.',
    'home.footer.desc': 'LUMA is the AI Visual Engine for the next generation of commerce.',

    // General UI
    'ui.upload': 'Click to Upload',
    'ui.upload.drag': 'Click or Drag to Upload',
    'ui.analyze': 'AI Analyze',
    'ui.generate': 'Generate Now',
    'ui.generating': 'Generating...',
    'ui.export': 'Export',
    'ui.back_home': 'Back Home',
    'ui.theme_toggle': 'Toggle Theme',
    'ui.lang_toggle': 'Toggle Language',

    // Operation Panel Headers
    'op.upload_ref': '1. Upload Reference',
    'op.select_model': '2. Select Model',
    'op.select_pose': '2. Select Pose',
    'op.select_scene': '2. Select Scene',
    'op.select_style': '2. Select Style',
    'op.prompt_label': 'Additional Details (Optional)',
    'op.platform': 'Platform',
    'op.quantity': 'Quantity',
    'op.resolution': 'Quality',
    'op.preview': 'Preview',

    // Buttons
    'btn.change': 'Change',
    'btn.smart_enhance': 'AI Enhance',

    // System Alerts & Errors
    'alert.pose_limit': 'Maximum 12 poses allowed',
    'alert.upload_product': 'Please upload product image first',
    'alert.batch_confirm': 'About to generate {n} images, which may take a few minutes. Continue?',
    'alert.select_scene': 'Please select at least one scene style',
    'alert.select_detail': 'Please select at least one detail area',
    'alert.upload_skeleton': 'Please upload skeleton image',
    'alert.upload_ref_garment': 'Please upload clothing reference image',
    'alert.upload_mannequin': 'Please upload mannequin/ghost images',
    'alert.upload_ref_product': 'Please upload product reference image',
    'alert.upload_base': 'Please upload base product/model image',
    'alert.error': 'Generation Error: ',
  }
};
