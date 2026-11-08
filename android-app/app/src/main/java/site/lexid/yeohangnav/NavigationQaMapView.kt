package site.lexid.yeohangnav

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.view.View

/**
 * First-party, offline QA illustration. No Kakao tiles or navigation data are copied here.
 * Visible ONLY in BuildConfig.DEBUG + explicit nav_qa_screen intent mode.
 */
internal class NavigationQaMapView(context: Context) : View(context) {
    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val density = resources.displayMetrics.density
    private fun rgb(r: Int, g: Int, b: Int) = Color.rgb(r, g, b)
    private fun line(c: Canvas, color: Int, width: Float, path: Path) {
        p.style = Paint.Style.STROKE
        p.strokeWidth = width * density
        p.strokeCap = Paint.Cap.ROUND
        p.strokeJoin = Paint.Join.ROUND
        p.color = color
        c.drawPath(path, p)
        p.style = Paint.Style.FILL
    }
    private fun text(c: Canvas, content: String, x: Float, y: Float, size: Float, color: Int, bold: Boolean = false) {
        p.color = color
        p.style = Paint.Style.FILL
        p.textSize = size * density
        p.typeface = if (bold) android.graphics.Typeface.DEFAULT_BOLD else android.graphics.Typeface.DEFAULT
        c.drawText(content, x, y, p)
    }

    override fun onDraw(c: Canvas) {
        super.onDraw(c)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w < 1 || h < 1) return
        c.drawColor(rgb(231, 239, 234))
        p.style = Paint.Style.FILL
        // Parks and waterways are generated shapes, not external map tiles.
        p.color = rgb(190, 221, 190)
        c.drawRoundRect(-w*.2f,h*.25f,w*.38f,h*.43f,45f,45f,p)
        c.drawRoundRect(w*.56f,h*.62f,w*1.16f,h*.88f,50f,50f,p)
        p.color = rgb(160, 213, 229)
        val river=Path().apply { moveTo(w*.88f,0f); cubicTo(w*.72f,h*.22f,w*1.12f,h*.33f,w*.78f,h*.57f); cubicTo(w*.63f,h*.74f,w*.89f,h*.9f,w*.7f,h) }
        line(c, rgb(165,217,228), 42f, river)
        line(c, rgb(205,237,245), 29f, river)
        // Local road lattice
        for (i in -2..8) {
            val xx=w*(i*.19f)
            val path=Path().apply { moveTo(xx-w*.12f,0f); lineTo(xx+w*.13f,h) }
            line(c,rgb(245,247,242),16f,path)
            line(c,rgb(218,228,218),1f,path)
        }
        for (i in 1..12) {
            val yy=h*(i*.095f)
            val path=Path().apply { moveTo(0f,yy + h*.012f); cubicTo(w*.35f, yy-h*.024f, w*.65f, yy+h*.025f,w,yy-h*.016f) }
            line(c,rgb(251,251,247),18f,path)
            line(c,rgb(219,227,216),1f,path)
        }
        p.color=rgb(200,214,204)
        for (row in 0..8) for (col in 0..5) {
            val xx=w*(col*.17f+.04f)
            val yy=h*(row*.11f+.035f)
            if ((row+col)%4==0) continue
            c.drawRoundRect(xx,yy,xx+w*.115f,yy+h*.052f,6f,6f,p)
        }
        // A bright first-party illustrative route.
        val route=Path().apply {
            moveTo(w*.51f,h*.83f)
            cubicTo(w*.52f,h*.71f,w*.52f,h*.61f,w*.50f,h*.54f)
            cubicTo(w*.48f,h*.47f,w*.72f,h*.43f,w*.69f,h*.34f)
            cubicTo(w*.66f,h*.26f,w*.59f,h*.24f,w*.61f,h*.20f)
        }
        line(c, rgb(251,251,252), 20f,route)
        line(c, rgb(26,110,236), 12f,route)
        p.color=rgb(16,108,180); c.drawCircle(w*.51f,h*.83f,19f*density,p)
        p.color=Color.WHITE; c.drawCircle(w*.51f,h*.83f,11f*density,p)
        p.color=rgb(28,178,96); c.drawCircle(w*.61f,h*.20f,17f*density,p)
        p.color=Color.WHITE; c.drawCircle(w*.61f,h*.20f,7f*density,p)
        text(c,"강남대로",w*.10f,h*.54f,13f,rgb(74,106,112),true)
        text(c,"테헤란로",w*.60f,h*.57f,13f,rgb(74,106,112),true)
        text(c,"도심공원",w*.07f,h*.33f,12f,rgb(69,124,83))
        text(c,"강남역",w*.61f,h*.23f,12f,rgb(22,94,88),true)
        // An unmistakable watermark differentiates QA mock from verified Kakao SDK map.
        p.color=rgb(255,251,223)
        c.drawRoundRect(w*.065f,h*.47f,w*.94f,h*.51f,12f,12f,p)
        text(c,"QA 데모 지도 · 실제 카카오 지도 아님",w*.10f,h*.494f,12f,rgb(109,79,22),true)
    }
}
