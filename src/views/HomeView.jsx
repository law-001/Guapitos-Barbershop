// Row of 5 stars; filled (gold) up to `value`, the rest dimmed.
const Stars = ({ value = 0, size = 15 }) => (
  <span style={{display:'inline-flex',gap:'2px',lineHeight:'1'}} aria-label={`${value} out of 5 stars`}>
    {[1,2,3,4,5].map(n=>(
      <span key={n} style={{color:n<=Math.round(value)?'#D6C3A0':'#3A352D',fontSize:size+'px'}}>★</span>
    ))}
  </span>
);

export default function HomeView({ goBook, goAccount, goAdmin, navServices, goReviews, reviews = [], onWriteReview }) {
  const pole = {
    display:'inline-block',width:'54px',height:'6px',borderRadius:'3px',
    background:'repeating-linear-gradient(135deg,#D6C3A0 0 7px,#15130F 7px 14px)',
    backgroundSize:'40px 100%',animation:'gbpole 1.6s linear infinite'
  };
  // Overall rating + the few reviews to feature on the landing page.
  const reviewCount = reviews.length;
  const avgRating = reviewCount ? reviews.reduce((s,r)=>s+(r.rating||0),0)/reviewCount : 0;
  // Feature the written reviews first (star-only ones make for empty cards).
  const featured = [...reviews].sort((a,b)=>(b.body?1:0)-(a.body?1:0)).slice(0, 3);
  const initialOf = (name) => (name||'?').trim().charAt(0).toUpperCase();

  return (
    <main>
      {/* HERO */}
      <section style={{position:'relative',minHeight:'clamp(520px,82vh,820px)',display:'flex',alignItems:'flex-end',padding:'clamp(32px,6vw,80px)',background:"linear-gradient(180deg,rgba(14,14,14,0.35) 0%,rgba(14,14,14,0.55) 45%,rgba(14,14,14,0.92) 88%,#0E0E0E 100%),url('/assets/shop-3.jpg') center 60%/cover no-repeat"}}>
        <div style={{position:'relative',maxWidth:'900px',animation:'gbfade 0.7s ease both'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'22px'}}>
            <span style={pole}></span>
            <span style={{fontFamily:"'Oswald'",letterSpacing:'0.24em',textTransform:'uppercase',fontSize:'13px',color:'#D6C3A0',fontWeight:'500'}}>Barbershop · Est · 2019 · Philippines</span>
          </div>
          <h1 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.01em',lineHeight:'0.94',fontSize:'clamp(44px,9vw,104px)',margin:'0',color:'#F4EFE7'}}>Look sharp.<br/><span style={{color:'#D6C3A0'}}>Stay guapo.</span></h1>
          <p style={{maxWidth:'520px',margin:'24px 0 0',fontSize:'clamp(16px,2vw,19px)',color:'#D9D3C9'}}>A premium-casual cut in a room built for it — warm light, black walls, master barbers, and zero rush. Book in under a minute.</p>
          <div style={{display:'flex',flexWrap:'wrap',gap:'14px',marginTop:'34px'}}>
            <button onClick={goBook} style={{background:'#D6C3A0',color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.08em',textTransform:'uppercase',fontSize:'16px',border:'none',borderRadius:'8px',padding:'16px 30px',cursor:'pointer'}}>Book an appointment</button>
            <button onClick={navServices} style={{background:'rgba(20,20,20,0.4)',color:'#F4EFE7',fontFamily:"'Oswald'",fontWeight:'500',letterSpacing:'0.08em',textTransform:'uppercase',fontSize:'16px',border:'1px solid rgba(214,195,160,0.4)',borderRadius:'8px',padding:'16px 30px',cursor:'pointer'}}>View services</button>
          </div>
        </div>
      </section>

      {/* VALUE STRIP */}
      <section style={{display:'flex',flexWrap:'wrap',gap:'2px',background:'#2A2622',borderBottom:'1px solid #2A2622'}}>
        {[['04','Master barbers, one chair each'],['10–8','Open Mon–Sat · closed Sundays'],['₱300','Haircut with shampoo, no surprises'],['GCash','Pay online or settle at the shop']].map(([stat,desc])=>(
          <div key={stat} style={{flex:'1',minWidth:'200px',background:'#0E0E0E',padding:'26px clamp(20px,4vw,40px)'}}>
            <div style={{fontFamily:"'Oswald'",fontSize:'30px',fontWeight:'700',color:'#D6C3A0'}}>{stat}</div>
            <div style={{color:'#9A9388',fontSize:'14px',marginTop:'2px'}}>{desc}</div>
          </div>
        ))}
      </section>

      {/* SERVICES */}
      <section id="gb-services" style={{padding:'clamp(48px,8vw,104px) clamp(16px,5vw,80px)',maxWidth:'1240px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:'16px',marginBottom:'40px'}}>
          <div>
            <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:'#D6C3A0',marginBottom:'10px'}}>The Menu</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0',lineHeight:'1'}}>Services &amp; pricing</h2>
          </div>
          <button onClick={goBook} style={{background:'transparent',color:'#D6C3A0',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px',border:'1px solid #2A2622',borderRadius:'8px',padding:'13px 22px',cursor:'pointer'}}>Start booking →</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'18px'}}>
          {[
            {title:"Cuts & Shave",items:[["Haircut","w/ shampoo","₱300"],["Guapito's Signature","+ face massage","₱350"],["Signature Shave","","₱300"],["Women's Cut","","₱400"]]},
            {title:"Treatments",items:[["Deep Conditioning","","₱900"],["Dry Scalp Treatment","","₱950"],["Anti Dandruff","","₱950"],["Massage","15 min","₱300"]]},
            {title:"Color",items:[["Hair Color — Ordinary","","₱750"],["Hair Color — Organic","","₱1,050"],["Beard Color — Ordinary","","₱550"],["Beard Color — Organic","","₱850"]]}
          ].map(group=>(
            <div key={group.title} style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'26px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
                <span style={{width:'18px',height:'34px',borderRadius:'4px',background:'repeating-linear-gradient(135deg,#D6C3A0 0 7px,#15130F 7px 14px)',backgroundSize:'40px 100%',animation:'gbpole 1.6s linear infinite'}}></span>
                <h3 style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'21px',margin:'0',color:'#F4EFE7'}}>{group.title}</h3>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'13px'}}>
                {group.items.map(([name,sub,price])=>(
                  <div key={name} style={{display:'flex',justifyContent:'space-between',gap:'12px',alignItems:'baseline'}}>
                    <span>{name}{sub&&<span style={{color:'#9A9388',fontSize:'13px'}}> · {sub}</span>}</span>
                    <span style={{fontFamily:"'Oswald'",fontWeight:'600',color:'#D6C3A0'}}>{price}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{background:'#1D1A15',border:'1px solid rgba(214,195,160,0.28)',borderRadius:'16px',padding:'26px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'20px'}}>
              <span style={{width:'18px',height:'34px',borderRadius:'4px',background:'repeating-linear-gradient(135deg,#D6C3A0 0 7px,#15130F 7px 14px)',backgroundSize:'40px 100%',animation:'gbpole 1.6s linear infinite'}}></span>
              <h3 style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.04em',fontSize:'21px',margin:'0',color:'#D6C3A0'}}>Packages</h3>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'11px',fontSize:'15px'}}>
              {[["Cut & Shave","₱550"],["Cut & Treatment","₱1,200+"],["Cut & Color","₱1,100+"],["Perm","₱2,000"],["Highlights","₱1,200+"],["Bleach / Fashion Color","₱1,800"]].map(([name,price])=>(
                <div key={name} style={{display:'flex',justifyContent:'space-between',gap:'12px'}}>
                  <span>{name}</span><span style={{fontFamily:"'Oswald'",fontWeight:'600',color:'#D6C3A0'}}>{price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{marginTop:'18px',background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'22px 26px',display:'flex',flexWrap:'wrap',alignItems:'center',gap:'18px'}}>
          <span style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.14em',fontSize:'13px',color:'#9A9388'}}>On the shelf</span>
          <div style={{display:'flex',flexWrap:'wrap',gap:'10px'}}>
            {[["Menstribe Matte Paste","₱440"],["Menstribe Clay","₱400"],["Forming Cream","₱600"]].map(([name,price])=>(
              <span key={name} style={{background:'#1D1A15',border:'1px solid #2A2622',borderRadius:'999px',padding:'7px 15px',fontSize:'14px'}}>{name} · <b style={{color:'#D6C3A0'}}>{price}</b></span>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gb-gallery" style={{padding:'clamp(20px,3vw,40px) clamp(16px,5vw,80px) clamp(48px,8vw,90px)',maxWidth:'1240px',margin:'0 auto'}}>
        <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:'#D6C3A0',marginBottom:'10px'}}>Inside the shop</div>
        <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0 0 28px',lineHeight:'1'}}>Black walls, warm light</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gridAutoRows:'240px',gap:'14px'}}>
          <img src="/assets/shop-6.jpg" alt="Mascot mural & leather chesterfield" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',gridRow:'span 2',border:'1px solid #2A2622'}}/>
          <img src="/assets/shop-1.jpg" alt="Front counter" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',border:'1px solid #2A2622'}}/>
          <img src="/assets/shop-5.jpg" alt="Barber chairs & cube-tile floor" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',border:'1px solid #2A2622'}}/>
          <img src="/assets/shop-4.jpg" alt="Storefront at night with barber pole" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',gridRow:'span 2',border:'1px solid #2A2622'}}/>
          <img src="/assets/shop-2.jpg" alt="Product shelf" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',border:'1px solid #2A2622'}}/>
          <img src="/assets/shop-3.jpg" alt="Chair under the bearded-gentleman mural" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'14px',border:'1px solid #2A2622'}}/>
        </div>
      </section>

      {/* REVIEWS — featured customer reviews pulled from the `reviews` table
          (mirrored from Guapito's Google Maps listing). Shows the average rating,
          a few featured cards, and a link to the full list / Google. */}
      <section id="gb-reviews" style={{borderTop:'1px solid #2A2622',padding:'clamp(48px,8vw,90px) clamp(16px,5vw,80px)',maxWidth:'1240px',margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',flexWrap:'wrap',gap:'16px',marginBottom:'34px'}}>
          <div>
            <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:'#D6C3A0',marginBottom:'10px'}}>What clients say</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(30px,5vw,52px)',margin:'0',lineHeight:'1'}}>Reviews</h2>
            {reviewCount>0 && (
              <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'14px'}}>
                <span style={{fontFamily:"'Oswald'",fontWeight:'700',fontSize:'26px',color:'#D6C3A0',lineHeight:'1'}}>{avgRating.toFixed(1)}</span>
                <Stars value={avgRating} size={18}/>
                <span style={{color:'#9A9388',fontSize:'14px'}}>· {reviewCount} {reviewCount===1?'review':'reviews'}</span>
              </div>
            )}
          </div>
          <button onClick={onWriteReview}
            style={{background:'transparent',color:'#D6C3A0',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px',border:'1px solid #2A2622',borderRadius:'8px',padding:'13px 22px',cursor:'pointer'}}>Write review</button>
        </div>

        {reviewCount===0 ? (
          <div style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'40px 30px',textAlign:'center',color:'#9A9388'}}>
            No reviews yet — <button onClick={onWriteReview} style={{background:'none',border:'none',color:'#D6C3A0',cursor:'pointer',fontSize:'inherit',padding:'0',textDecoration:'underline'}}>be the first</button>.
          </div>
        ) : (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'18px'}}>
              {featured.map(r=>(
                <div key={r.id} style={{background:'#15130F',border:'1px solid #2A2622',borderRadius:'16px',padding:'24px',display:'flex',flexDirection:'column',gap:'14px'}}>
                  <Stars value={r.rating} size={16}/>
                  {r.body && <p style={{color:'#F4EFE7',fontSize:'15px',lineHeight:'1.55',margin:'0',flex:'1'}}>“{r.body}”</p>}
                  <div style={{display:'flex',alignItems:'center',gap:'12px',marginTop:'2px'}}>
                    <span style={{flexShrink:'0',display:'flex',alignItems:'center',justifyContent:'center',width:'40px',height:'40px',borderRadius:'50%',background:'#D6C3A0',color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'700',fontSize:'18px'}}>{initialOf(r.author)}</span>
                    <div style={{minWidth:'0'}}>
                      <div style={{fontFamily:"'Oswald'",fontSize:'16px',lineHeight:'1.2'}}>{r.author}</div>
                      {(r.relativeTime || r.reviewDate) && <div style={{color:'#9A9388',fontSize:'13px'}}>{r.relativeTime || new Date(r.reviewDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'})}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {reviewCount>featured.length && (
              <div style={{textAlign:'center',marginTop:'28px'}}>
                <button onClick={goReviews} style={{background:'transparent',color:'#F4EFE7',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'15px',border:'1px solid #2A2622',borderRadius:'8px',padding:'14px 28px',cursor:'pointer'}}>Read all {reviewCount} reviews →</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* VISIT */}
      <section id="gb-visit" style={{borderTop:'1px solid #2A2622',background:'#15130F',padding:'clamp(48px,8vw,90px) clamp(16px,5vw,80px)'}}>
        <div style={{maxWidth:'1240px',margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'40px'}}>
          <div>
            <div style={{fontFamily:"'Oswald'",letterSpacing:'0.22em',textTransform:'uppercase',fontSize:'13px',color:'#D6C3A0',marginBottom:'10px'}}>Visit us</div>
            <h2 style={{fontFamily:"'Oswald'",fontWeight:'700',textTransform:'uppercase',fontSize:'clamp(28px,4vw,44px)',margin:'0 0 20px',lineHeight:'1'}}>Hours &amp; location</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'9px',maxWidth:'380px'}}>
              {[['Monday – Friday','9:00 AM – 7:00 PM'],['Saturday','9:00 AM – 7:00 PM']].map(([d,t])=>(
                <div key={d} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #2A2622',paddingBottom:'9px'}}>
                  <span style={{color:'#9A9388'}}>{d}</span><span style={{fontFamily:"'Oswald'",color:'#F4EFE7'}}>{t}</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',paddingBottom:'2px'}}>
                <span style={{color:'#9A9388'}}>Sunday</span><span style={{fontFamily:"'Oswald'",color:'#C46A5A'}}>Closed</span>
              </div>
            </div>
            <div style={{marginTop:'26px',color:'#D9D3C9',lineHeight:'1.7'}}>
              <div style={{fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'13px',color:'#9A9388',marginBottom:'4px'}}>Address</div>
              <div>2nd Floor, JIVC Building, MacArthur Hwy</div>
              <div>Lolomboy, Bocaue, 3018 Bulacan</div>
              <div style={{marginTop:'14px',fontFamily:"'Oswald'",textTransform:'uppercase',letterSpacing:'0.1em',fontSize:'13px',color:'#9A9388',marginBottom:'4px'}}>Contact</div>
              <div>[Mobile number] · [@instagram]</div>
            </div>
            <button onClick={goBook} style={{marginTop:'28px',background:'#D6C3A0',color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.08em',textTransform:'uppercase',fontSize:'15px',border:'none',borderRadius:'8px',padding:'14px 26px',cursor:'pointer'}}>Book your chair</button>
          </div>
          <div style={{position:'relative',minHeight:'280px',borderRadius:'16px',overflow:'hidden',border:'1px solid #2A2622',background:'linear-gradient(135deg,#1a1714,#0E0E0E)'}}>
            <iframe
              title="Guapito's Barbershop location"
              src="https://www.google.com/maps?q=14.7755806,120.9387192&z=17&output=embed"
              style={{position:'absolute',inset:'0',width:'100%',height:'100%',border:0,filter:'grayscale(0.3) contrast(1.05)'}}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=14.7755806,120.9387192"
              target="_blank"
              rel="noopener noreferrer"
              style={{position:'absolute',right:'14px',bottom:'14px',display:'flex',alignItems:'center',gap:'8px',background:'#D6C3A0',color:'#0E0E0E',fontFamily:"'Oswald'",fontWeight:'600',letterSpacing:'0.06em',textTransform:'uppercase',fontSize:'13px',textDecoration:'none',borderRadius:'8px',padding:'10px 16px',boxShadow:'0 4px 14px rgba(0,0,0,0.4)'}}
            >
              ➤ Get directions
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:'#0B0B0B',borderTop:'1px solid #2A2622',padding:'clamp(36px,6vw,60px) clamp(16px,5vw,80px) 30px'}}>
        <div style={{maxWidth:'1240px',margin:'0 auto',display:'flex',flexWrap:'wrap',gap:'30px',alignItems:'center',justifyContent:'space-between'}}>
          <img src="/assets/logo.jpg" alt="Guapito's" style={{height:'52px',borderRadius:'6px'}}/>
          <div style={{color:'#9A9388',fontSize:'14px',maxWidth:'360px'}}>Premium-casual men's barbershop. Old-world craft, modern booking — book a chair with any of our four barbers in under a minute.</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <button onClick={goBook} style={{background:'transparent',border:'none',color:'#F4EFE7',fontSize:'14px',cursor:'pointer',textAlign:'left',padding:'0'}}>Book an appointment</button>
            <button onClick={goAccount} style={{background:'transparent',border:'none',color:'#F4EFE7',fontSize:'14px',cursor:'pointer',textAlign:'left',padding:'0'}}>My appointments</button>
            <button onClick={goAdmin} style={{background:'transparent',border:'none',color:'#9A9388',fontSize:'14px',cursor:'pointer',textAlign:'left',padding:'0'}}>Staff / barber login →</button>
          </div>
        </div>
        <div style={{maxWidth:'1240px',margin:'26px auto 0',paddingTop:'20px',borderTop:'1px solid #2A2622',color:'#5e574d',fontSize:'13px'}}>© 2019–2026 Guapito's Barbershop · Est. 2019 · Philippines</div>
      </footer>
    </main>
  );
}
