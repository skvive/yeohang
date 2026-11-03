import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '여행갈지도 NAV · 그때는 대동여지도, 지금은 여행갈지도';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: 'linear-gradient(120deg,#052a42 0%,#07565a 61%,#13a7a2 100%)', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      <div style={{ position:'absolute',top:-140,right:-90,width:660,height:660,borderRadius:420,border:'2px solid rgba(255,255,255,.14)',display:'flex' }} />
      <div style={{ position:'absolute',top:-30,right:10,width:430,height:430,borderRadius:250,border:'1px solid rgba(255,255,255,.16)',display:'flex' }} />
      <div style={{ position:'absolute',bottom:-160,right:150,width:600,height:600,borderRadius:400,background:'radial-gradient(circle,#ff9e2050,transparent 65%)',display:'flex' }} />
      <div style={{ padding:'70px 76px',display:'flex',flexDirection:'column',width:870,zIndex:2 }}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{width:55,height:55,borderRadius:17,background:'#ff7825',display:'flex',alignItems:'center',justifyContent:'center',fontSize:31}}>⌖</div>
          <div style={{fontSize:34,fontWeight:900,letterSpacing:-1}}>여행갈지도 <span style={{fontSize:19,color:'#ffc97b',letterSpacing:3}}>NAV</span></div>
        </div>
        <div style={{fontSize:25,color:'#b5efdf',marginTop:64,fontWeight:700}}>그때는 대동여지도,</div>
        <div style={{fontSize:67,fontWeight:900,letterSpacing:-3,marginTop:9,whiteSpace:'nowrap'}}>지금은 여행갈지도.</div>
        <div style={{height:7,width:132,background:'#ffb447',borderRadius:9,marginTop:27}}/>
        <div style={{fontSize:24,color:'#e5f8f4',marginTop:32}}>스마트 여행 내비게이션 · 숙소 · 맛집 · 쿠폰</div>
        <div style={{fontSize:16,color:'#b2dcd6',marginTop:49,letterSpacing:3}}>TRAVEL GALJIDO · FIND YOUR NEXT JOURNEY</div>
      </div>
      <div style={{position:'absolute',top:160,right:108,width:170,height:250,background:'#fff8e9',borderRadius:27,transform:'rotate(12deg)',boxShadow:'0 20px 50px #00253188',display:'flex',flexDirection:'column',alignItems:'center',padding:15}}>
        <div style={{width:'100%',height:26,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#084b56',fontWeight:800}}>여행갈지도</div>
        <div style={{marginTop:6,width:'100%',height:156,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(140deg,#d8f4d8 0%,#79d5cf 53%,#48b4e4 100%)'}}>
          <div style={{height:118,width:8,background:'#fff8e9',borderRadius:10,transform:'rotate(40deg)',display:'flex'}}/>
          <div style={{height:32,width:32,borderRadius:18,background:'#ff7b24',border:'7px solid white',display:'flex',marginLeft:-14,marginTop:-32}}/>
        </div>
        <div style={{display:'flex',fontSize:12,color:'#156567',marginTop:12,fontWeight:750}}>길별이와 함께하는 여행</div>
      </div>
      <div style={{position:'absolute',top:155,right:310,width:26,height:26,borderRadius:26,background:'#ffb347',display:'flex'}}/>
      <div style={{position:'absolute',top:395,right:90,width:19,height:19,borderRadius:19,background:'#fff',display:'flex'}}/>
    </div>,
    size
  );
}
