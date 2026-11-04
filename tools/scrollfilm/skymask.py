import cv2, numpy as np
def sky_mask(bgr):
    H,W=bgr.shape[:2]; s=1280/W
    small=cv2.resize(bgr,(1280,int(round(H*s)))); f=small.astype(np.float32)
    b,r=f[...,0],f[...,2]
    gray=cv2.cvtColor(small,cv2.COLOR_BGR2GRAY).astype(np.float32)
    mu=cv2.blur(gray,(9,9)); sd=np.sqrt(np.maximum(cv2.blur(gray*gray,(9,9))-mu*mu,0))
    cand=((b-r>-2)&(gray>170)&(sd<6)).astype(np.uint8)
    n,lab=cv2.connectedComponents(cand)
    top=[l for l in np.unique(lab[0]) if l>0]
    sure_sky=np.isin(lab,top).astype(np.uint8)
    sure_sky=cv2.erode(sure_sky,np.ones((9,9),np.uint8))
    m=np.full(gray.shape,cv2.GC_PR_FGD,np.uint8)
    h=gray.shape[0]
    m[:int(h*0.42)][gray[:int(h*0.42)]>160]=cv2.GC_PR_BGD
    m[sure_sky>0]=cv2.GC_BGD
    m[int(h*0.45):]=cv2.GC_FGD
    bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
    cv2.grabCut(small,m,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
    fgm=np.where((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD),255,0).astype(np.uint8)
    fgm=cv2.morphologyEx(fgm,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    # drop small floating blobs in the sky
    n2,lab2,st,_=cv2.connectedComponentsWithStats(fgm)
    keep=np.zeros_like(fgm)
    for i in range(1,n2):
        if st[i,cv2.CC_STAT_AREA]>4000: keep[lab2==i]=255
    a=cv2.resize(keep,(W,H),interpolation=cv2.INTER_LINEAR)
    a=cv2.GaussianBlur(a,(0,0),1.6)
    return a  # 255 = foreground (house, trees), 0 = sky
