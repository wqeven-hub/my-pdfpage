const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');

const app = express();
const PORT = process.env.PORT || 3000; // 适配Vercel自动分配的端口

// 跨域+静态文件配置
app.use(cors());
app.use(express.static('public'));

// 文件上传配置（临时存储）
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 限制100MB
});

// 创建临时文件夹
fs.ensureDirSync('uploads');

// 核心解锁接口
app.post('/unlock-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    // 读取上传的PDF文件
    const pdfBytes = await fs.readFile(req.file.path);
    
    // 加载PDF并忽略加密
    const originalDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    
    // 新建PDF并复制所有页面（解除限制核心逻辑）
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(originalDoc, originalDoc.getPageIndices());
    pages.forEach(page => newDoc.addPage(page));
    
    // 生成解锁后的PDF字节流
    const unlockedBytes = await newDoc.save({ encryption: false });

    // 返回文件给前端下载
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="unlocked.pdf"`);
    res.send(Buffer.from(unlockedBytes));

  } catch (error) {
    console.error('处理失败：', error);
    res.status(500).json({ 
      success: false, 
      message: '该PDF无法处理，建议使用SmallPDF' 
    });
  } finally {
    // 清理临时文件（避免占用空间）
    if (req.file) fs.unlinkSync(req.file.path);
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行中：端口 ${PORT}`);
});
