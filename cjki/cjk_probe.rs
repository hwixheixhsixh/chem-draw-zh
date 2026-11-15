// 诊断：中文文本在 Octet 的导出链路（usvg → resvg）里能否正确渲染
// 用法: cargo run --release --example cjk_probe -- <输出目录>
use std::fs;
use std::path::PathBuf;

fn main() {
    let out = std::env::args().nth(1).map(PathBuf::from).unwrap_or_else(|| std::env::temp_dir());
    fs::create_dir_all(&out).unwrap();

    let mut db = svg2pdf::usvg::fontdb::Database::new();
    db.load_system_fonts();
    let families: Vec<String> = db.faces().filter_map(|f| f.families.first().map(|(n, _)| n.clone())).collect();
    let cjk_like: Vec<String> = families.iter()
        .filter(|n| n.contains("雅黑") || n.contains("宋体") || n.contains("黑体") || n.contains("楷体")
            || n.contains("等线") || n.contains("思源") || n.contains("Noto Sans CJK") || n.contains("Noto Serif CJK")
            || n.contains("SimSun") || n.contains("SimHei") || n.contains("Microsoft YaHei") || n.contains("KaiTi")
            || n.contains("DengXian") || n.contains("JhengHei") || n.contains("FangSong"))
        .take(12).cloned().collect();
    println!("fontdb 载入字体 {} 个；识别出的中文字体 {} 个: {:?}", families.len(), cjk_like.len(), cjk_like);

    let cases: [(&str, &str, &str); 5] = [
        ("1-arial-zh", "Arial, Helvetica, sans-serif", "催化循环与过渡态"),
        ("2-yahei-zh", "Microsoft YaHei, Arial, sans-serif", "催化循环与过渡态"),
        ("3-simsun-mixed", "SimSun, serif", "过渡态能垒 12.5 kcal/mol"),
        ("4-ascii", "Arial, Helvetica, sans-serif", "Catalytic cycle"),
        ("5-fallback", "Arial, Helvetica, sans-serif", "Ac2O/吡啶 85°C"),
    ];

    let shared = std::sync::Arc::new(db);
    for (id, family, text) in cases {
        let svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="380" height="56" viewBox="0 0 380 56">
  <rect width="380" height="56" fill="white"/>
  <text x="6" y="38" font-family="{}" font-size="22" fill="black">{}</text>
</svg>"#,
            family, text
        );
        fs::write(out.join(format!("{id}.svg")), &svg).unwrap();

        let mut opt = svg2pdf::usvg::Options::default();
        opt.fontdb = shared.clone();
        match svg2pdf::usvg::Tree::from_str(&svg, &opt) {
            Ok(tree) => {
                let mut pm = resvg::tiny_skia::Pixmap::new(380, 56).unwrap();
                {
                    let mut pmut = pm.as_mut();
                    resvg::render(&tree, resvg::tiny_skia::Transform::identity(), &mut pmut);
                }
                fs::write(out.join(format!("{id}.png")), pm.encode_png().unwrap()).unwrap();
                let mut ink = 0usize;
                for px in pm.pixels() {
                    if px.red() < 200 || px.green() < 200 || px.blue() < 200 { ink += 1; }
                }
                // 至少能判断"有没有画出东西"
                let verdict = if ink > 400 { "OK（有字）" } else if ink > 40 { "可能缺字" } else { "!! 空白（丢字）" };
                println!("{:<15} ink_px={:<6} {}", id, ink, verdict);
            }
            Err(e) => println!("{:<15} usvg 失败: {e}", id),
        }
    }
    println!("\n输出目录: {}", out.display());
}
