const G = 6.67E-11;
const AU = 1.495978707E11; // 1 AU in meters
const MAX_TRACE = 600;
const TILT_RAD = -Math.PI*70/180;
const SIN_TETA = Math.sin(TILT_RAD); // 30 degr tilt in radian for 3d view
const COS_TETA = Math.cos(TILT_RAD); 
var cfg, cfg_step
var pz, touch = 'ontouchstart' in window;
var canvas, ctx, DB, ox, oy, oz, t0;
var panx = 0, pany = 0;
var Timer = null;
var dbug = false;

function SetLS(name,v) { localStorage.setItem('SG_' + name, v) }

export function init() {
	canvas = document.getElementById("simulg");
	ctx = canvas.getContext("2d");
	try   {cfg = JSON.parse(GetLS('cfg', JSON.stringify(cfg)))}
	catch {};
	cfg_step = 20; 
	UpdtCfg(); // save and update GUI 

	window.addEventListener('resize', Resize);
	canvas.addEventListener('wheel', Wheel);
	window.addEventListener('keydown', KeyDown);

	// register mouse events
	['mousedown', 'mousemove', 'mouseup'].forEach(evn => {
		canvas.addEventListener(evn, Mouse); });

	//  and touch events
	if (touch) { 
		['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(evn => {
			canvas.addEventListener(evn, Touch); })	}	

	LoadDB();
	SetAppLang(); // for language 
	DoResize();
	Start(GetLS('sys',0));
	setInterval(ChkWSize, 500);
}

// Mouse event handling section
const MS=Object.freeze({up:Symbol('up'), down:Symbol('down')});
var ms = { mode:MS.up,lx:-1,ly:-1,ls:0,t0:0 }; // mouse state
var TP = false;
function Mouse(e) {
	let t = Date.now();
	let dt = t - ms.t0;
	switch (e.type) {
	case 'mousedown' : TP =true; ms.lx = e.offsetX; ms.ly = e.offsetY; ms.mode = MS.down; ms.t0 = t; break;
	case 'mouseup'   : ms.mode = MS.up; if (dt<200) Click(ms.lx, ms.ly, e); TP=false;break;
	case 'mousemove' : if (dt>100 && ms.mode == MS.down) {
		let d = Math.hypot(e.offsetX-ms.lx, e.offsetY-ms.ly);
		if (d>5) { 
			panx += e.offsetX-ms.lx; pany += e.offsetY-ms.ly; 
			ms.lx = e.offsetX; ms.ly = e.offsetY; 
			Draw(); }
}	} 	}

// Touch events handling section
const TM=Object.freeze({pan:Symbol('pan'), speed:Symbol('speed'),pinch:Symbol('pinch')});
function TM2S(tm) {switch(tm){case TM.pan:return 'pan';case TM.speed:return 'speed';case TM.pinch:return 'pinch';} return 'undefined'; }// Just for debug
var ts = { n:0, mode:TM.pan, can_click:true, panv:false };
function Touch(e) {
	var x,y,d;
	let t = Date.now();
	let tchs = e.touches;
	let dt = t - ts.t0; // time since original touch or pinch
	let n = tchs?tchs.length:0;
	if (e.type=='touchstart') { // one event for each point for pinch
		TP = true;
		let br = e.target.getBoundingClientRect();
		ts.ofx = br.x; ts.ofy = br.y; // convert ClientXY to offsetXY
		ts.can_click &&= (n == 1); // if ever n !=1: disallow click  
		if (ts.n != 2 && n == 2) { // switch to pinch 
			ts.mode=TM.pinch; 
			ts.x = (tchs[0].clientX + tchs[1].clientX)/2-ts.ofx;
			ts.y = (tchs[0].clientY + tchs[1].clientY)/2-ts.ofy;	
			ts.ldd = 1;		
			ts.s0 = cfg.scale;
			ts.d0 = Math.hypot(tchs[0].clientX - tchs[1].clientX,
				tchs[0].clientY - tchs[1].clientY); 
		} else if (n == 1) {
			ts.mode = TM.pan;
			ts.x = tchs[0].clientX; ts.y = tchs[0].clientY;
			ts.panv = ts.x > ww * 0.9 || ts.x < ww / 10;
			if (ts.panv || ts.y > wh * 0.9) { ts.mode=TM.speed; TP=false }
			ts.t0 = t; }
	} else if (e.type=='touchmove') {
		if (ts.mode == TM.pan) {
			x = tchs[0].clientX; y = tchs[0].clientY;
			d = Math.hypot(x-ts.x, y-ts.y);
			if (d>10) { panx += x - ts.x; pany += y-ts.y; ts.x = x; ts.y = y; Draw(); }
		} else if (ts.mode == TM.speed) {
			var spd_chng;
			x = tchs[0].clientX; y = tchs[0].clientY;
			if (ts.panv) spd_chng = 10*(ts.y - y)/wh;
			else spd_chng = 10*(x - ts.x)/ww;
			if (spd_chng > 0) spd_chng++;
			else spd_chng = 1/(1-spd_chng);
			cfg.speed *= spd_chng; ts.x = x; ts.y = y;
			UpdtFooter();
		} else if (ts.mode == TM.pinch) {
			// you can pan while pinching
			x = (tchs[0].clientX + tchs[1].clientX)/2-ts.ofx;
			y = (tchs[0].clientY + tchs[1].clientY)/2-ts.ofy;
			d = Math.hypot(x-ts.x, y-ts.y);
			if (d>10) { panx += x - ts.x; pany += y-ts.y; ts.x = x; ts.y = y; Draw() }

			// Check for zoom (here d is distance between the 2 touch)
			d = Math.hypot(tchs[0].clientX - tchs[1].clientX, tchs[0].clientY - tchs[1].clientY);
			let dd = ts.d0/d; // relative zoom
			if (Math.abs(dd-ts.ldd) >0.05) {				
				ZoomTraces(dd*ts.s0, true);
				let nx = (x - wcx) / dd + wcx;
				let ny = (y - wcy) / dd + wcy;
				panx += ts.x-x; pany += ts.y-y;
				ts.ldd = dd;
				Draw();			
			}
		}
	} else if (e.type=='touchend' && n==0) {
		if (ts.can_click && dt<500)	Click(ts.x-ts.ofx, ts.y-ts.ofy, e, dt>250);
		ts.can_click = true;
		ts.mode = TM.pan;
		TP = false;
	} 
	ts.n = n;
	e.preventDefault();
}

// Find closest object and set as center or display details
function Click(clx, cly, evt, shift) {
	var x,y,z,d; // object coordinate conversion (space to screen)
	let scale = ww/2/cfg.scale/AU;
	let mind = 1E500, mix = -1;

	State.items.forEach((e,i)=>{
		x = e.x - ox; y = oz - e.z; z = e.y - oy;  // space relative to reference object		
		x = x * scale + wcx + panx;
		if (cfg.view=='3d') y = y*COS_TETA + z*SIN_TETA;
		y = y * scale + wcy + pany;

		d = Math.hypot(x-clx, y-cly);
		if (d < mind && d<100) {mind =d; mix = i }
	})
	// console.log(mix, mind, State.items[mix].name);

	if (mix>=0) {
		if((evt.shiftKey || shift) && mix!=State.center) CenterOn(mix);
		else State.items[mix].details = !State.items[mix].details;
		evt.preventDefault(); Draw();
}	}

export function Dbug(txt) { 
	if (!dbug) return;
	let dbl = document.getElementById('dbug');
	if (txt) dbl.innerHTML = txt;
	else dbl.innerHTML='';
}
function GetLS(name,def) {
	name = 'SG_' + name;
	let v = localStorage.getItem(name);
	if (v===undefined || v === null) v = def;
	return v; }
// String with a '|' in the middle are french|english options
function ENFR(s) { 
	let ll = s.split('|'); 
	return (cfg.lang.toLowerCase() == 'en' | ll.length==1)?ll[0]:ll[1]; 
}
function ClearTrace() {	State.items.forEach(e=>{e.trace=[]}); }
function Wheel(e) {
	let up =  e.wheelDeltaY>0;
	if (e.ctrlKey) cfg.speed *= up?2:0.5;
	else {
		let zoom = (!up)?1/0.9:0.9
		ZoomTraces(zoom);
		// make sure objects under mouse pointer stay there
		let nx = (e.offsetX - wcx) / zoom + wcx;
		let ny = (e.offsetY - wcy) / zoom + wcy;
		panx += e.offsetX-nx; pany += e.offsetY-ny;
	}
	e.preventDefault();
	Draw()
	UpdtFooter();;
}
var ResTo = null;
function Resize(){ clearTimeout(ResTo);	ResTo = setTimeout(DoResize, 100); }
function DoResize(mch) { // mh : measure height
	// Offset traces to new screen center 
	let hdr = document.getElementById('header');
	let ftr = document.getElementById('footer');
	let CVH = window.innerHeight - hdr.offsetHeight - ftr.offsetHeight;
	CVH -= ftr.getBoundingClientRect().top - canvas.getBoundingClientRect().bottom;
	if (mch) return CVH;
	if (State) {		
		let dsc = window.innerWidth / ww;  // scale change
		let cx2 = Math.floor(window.innerWidth/2);
		let cy2 = Math.floor(CVH/2);

		State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x - wcx) * dsc + cx2; 
			pt.y = (pt.y - wcy) * dsc + cy2; 
		})})
	}
	ww = window.innerWidth;
	wh = CVH;
	ctx.canvas.width = ww;
	ctx.canvas.height = CVH; 
	wcx = Math.round(ww/2);  // window center
	wcy = Math.round(wh/2);
	if (cfg.pause) Draw();
}
function ChkWSize() {
	let hh = DoResize(true);
	if (Math.abs(hh - ctx.canvas.height)> 2) 
		DoResize(); 
}
export function Help() {
	window.open('Help_' + cfg.lang + '.htm', 'help').focus();
}
// Rescale 2d traces to new zoom
export function ZoomTraces(nz, abs) {
	if (abs) nz = nz/cfg.scale;
	State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x-wcx) / nz + wcx;
			pt.y = (pt.y-wcy) / nz + wcy;
		})})
	cfg.scale *= nz;
	panx = Math.round(panx / nz);
	pany = Math.round(pany / nz);
	UpdtFooter();
}
function KeyDown(kev) {
	let key = kev.key.toLowerCase(); 
	let ud = '+-'.indexOf(key); 
	let prev = true;
	if(key == ' ') Pause(); 
	else if (ud >= 0) {
		if (kev.ctrlKey) cfg.speed *= (ud==0)?2:0.5;
		else ZoomTraces((ud==1)?1/0.9:0.9);  		
		if (cfg.pause) Draw()
		UpdtFooter(); }
	else if ('na'.includes(key)) UpdtCfg('text', !cfg.text);
	else if ('ot'.includes(key)) UpdtCfg('trace', !cfg.trace);
	else if (key=='r') UpdtCfg('fake_r', !cfg.fake_r);
	else if (key=='2') UpdtCfg('view', '2d');
	else if (key=='3') UpdtCfg('view', '3d');
	else if (key=='d') dbug = !dbug;
	else if (kev.code=='PageDown') Start((State.ix+1)%DB.length);
	else if (kev.code=='PageUp')   Start((State.ix+DB.length-1)%DB.length);	
	else if (kev.code=='Home') { panx=0; pany=0; }
	else prev = false;
	if (prev) { kev.preventDefault(); Draw()  }
}
export function SetAppLang(newLang) {
	let sys_list = '';
	if (newLang) { UpdtCfg('lang',newLang) }
	if (!cfg.lang) cfg.lang = 'en';
	document.getElementById('lang').value = cfg.lang.toUpperCase();
	DB.forEach((sys)=>{
		let opt ='<option';
		if (sys.hint) opt += ' Title="' + ENFR(sys.hint) + '"';
		sys_list += opt + '>' + ENFR(sys.name) + '</option>'});
	document.getElementById('sys').innerHTML = sys_list;
	document.getElementById('labsys').innerHTML = ENFR('System:|Système:');
	document.getElementById('laborg').innerHTML = ENFR('Reference:|Référence:');
	document.getElementById('view').innerHTML = ENFR('View:|Vue:');
	document.getElementById('labtop').innerHTML = ENFR('2d');
	document.getElementById('lab3d').innerHTML = ENFR('3d');
	document.getElementById('org').title = 
		ENFR("You can also [Shift] click on the object|Vous pouvez aussi faire [Shift] clic sur l'objet");
	document.getElementById('radius').title = 
		ENFR("Show exagerated radius|Montrer un rayon exagéré ");
	document.getElementById('labtime').innerHTML = ENFR('Duration:|Durée:');
	document.getElementById('labscale').innerHTML = ENFR('Scale:|Échelle:');	
	document.getElementById('labspeed').innerHTML = ENFR('Speed:|Vitesse:');
	document.title = ENFR("Gravitational Simulator|Simulateur Gravitationnel");
	if (State) Start(State.ix);
}
function LoadDB() {
	// Distances and scale in AU, masses in kg, speeds in km/s, radius in km
	DB = [
		{ name:"Solar System|Système Solaire", speed:2E6, center:-1, scale: 50,
		  hint:"All planets|Toutes les planètes",
		items: [
			{name:"Sun|Soleil", c:'#FFFFA0', r:695508, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0},
			{name:"Mercury|Mercure", c:'#C0C0C0', r:2440, m:3.3E23,
				x:0.3841, y:0.0472, z:0, vx:0, vy:0, vz:47.9},
			{name:"Venus", c:'#E0A0A0', r:6052, m:4.867E24,
				x:-0.7226, y:-0.0429, z:0, vx:0, vy:0, vz:-35},
			{name:"Earth|Terre", c:'#A0A0FF', r:6371, m:5.972E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0},
			{name:"Mars", c:'#F59C5A', r:3390, m:6.417E23,
				x:1.5226, y:0.0505, z:0, vx:0, vy:0, vz:24.1},
			{name:"Jupiter", c:'#F5DE9B', r:69911, m:1.898E27,
				x:5.2026, y:0.118, z:0, vx:0, vy:0, vz:13.1},
			{name:"Saturn|Saturne", c:'#DEB64B', r:58323, m:5.68E26,
				x:-9.5389, y:-0.4164, z:0, vx:0, vy:0, vz:-9.6},
			{name:"Uranus", c:'#9898B0', r:25362, m:8.681E25,
				x:0, y:0, z:-19.1821, vx:6.8, vy:0, vz:0},
			{name:"Neptune", c:'#8080B0', r:24622, m:1.024E26,
				x:-30.0405, y:-0.9425, z:0, vx:0, vy:0, vz:-5.4},
			{name:"Pluto|Pluton", c:'#F5DCCE', r:1188, m:1.3E22,
				x:47.0929, y:14.5724, z:0, vx:0, vy:0, vz:3.63}]},

		{ name:"Terrestrial Planets|Planètes terrestres", speed:1E6, center:-1, scale: 3,
		items: [
			{name:"Sun|Soleil", c:'#FFFFA0', r:695508, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0},
			{name:"Mercury|Mercure", c:'#C0C0C0', r:2440, m:3.3E23,
				x:0.3841, y:0.0472, z:0, vx:0, vy:0, vz:47.9},
			{name:"Venus", c:'#E0A0A0', r:6052, m:4.867E24,
				x:-0.7226, y:-0.0429, z:0, vx:0, vy:0, vz:-35},
			{name:"Earth|Terre", c:'#A0A0FF', r:6371, m:5.972E24,
				x:0, y:0, z:1, vx:-29.786, vy:0, vz:0},
			{name:"Moon|Lune", c:'#A0A0FF', r:1737.4, m:7.3477E22,
				x:0, y:0, z:1.00256955529, vx:-30.78416208, vy:-0.08987384, vz:0}, 
			{name:"Mars", c:'#F59C5A', r:3390, m:6.417E23,
				x:1.5226, y:0.0505, z:0, vx:0, vy:0, vz:24.1}]},

		{ name:"Jovian Planets|Planètes joviennes", speed:5E7, center:-1, scale: 60,
		items: [
			{name:"Sun|Soleil", c:'#FFFFA0', r:695508, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0},
			{name:"Jupiter", c:'#F5DE9B', r:69911, m:1.898E27,
				x:5.2026, y:0.118, z:0, vx:0, vy:0, vz:13.1},
			{name:"Saturn|Saturne", c:'#DEB64B', r:58323, m:5.68E26,
				x:-9.5389, y:-0.4164, z:0, vx:0, vy:0, vz:-9.6},
			{name:"Uranus", c:'#9898B0', r:25362, m:8.681E25,
				x:0, y:0, z:-19.1821, vx:6.8, vy:0, vz:0},
			{name:"Neptune", c:'#8080B0', r:24622, m:1.024E26,
				x:-30.0405, y:-0.9425, z:0, vx:0, vy:0, vz:-5.4},
			{name:"Pluto|Pluton", c:'#F5DCCE', r:1188, m:1.3E22,
				x:47.0929, y:14.5724, z:0, vx:0, vy:0, vz:3.63}]},
		
		{ name:"Apollo", speed:6000, center:0, scale:0.002,
		  hint:"Free return trajectory|Trajectoire de retour vers la terre",
		items: [
			{name:"Earth|Terre", c:'#A0A0FF', r:6378, m:5.98E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0} ,
			{name:"Sun|Soleil", c:'#FFFFA0', r:696340, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0}, 
			{name:"csm", c:'#808080', r:0.02, m:1050,
				x:4.7E-5, y:0, z:0.999976, vx:-24.3320, vy:0, vz:8.3393},
			{name:"Moon|Lune", c:'#C0C0C0', r:1737, m:7.36E22,
				x:0, y:0, z:1.0026, vx:-30.82, vy:0, vz:0}]},

		{ name:"Binary Star System|Système Binaire", speed:3E5, center:-1, scale:0.75,
		items: [
			{name:"star 1|étoile 1", c:'#FFFFA0', r:696340, m:1.99E30,
				x:-0.1857, y:0, z:0, vx:0, vy:0, vz:-23},
			{name:"star 2|étoile 2", c:'#F0D090', r:450340, m:1.4E30,
				x:0.2525, y:0, z:0, vx:0, vy:0, vz:33},
			{name:"planet|planète", c:'#A0A0A0', r:450340, m:1E24,
				x:0.080, y:0, z:0, vx:25, vy:-50, vz:0}]},
		{ name:"8 Stars/Picard|Picard/8 étoiles", speed:2E7, center:-1, scale:20,
		items: [
			{name: 'A', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:13.0, vx:-21.956568149319196, vy:0, vz:0},
			{name: 'B', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:12.0, vx:-0.8411244870300862, vy:0, vz:0},
			{name: 'C', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:8.0, vx:-8.601988993759026, vy:0, vz:0},
			{name: 'D', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:7.0, vx:12.513454668530084, vy:0, vz:0},
			{name: 'E', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:-7.0, vx:-12.513454668530084, vy:0, vz:0},
			{name: 'F', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:-8.0, vx:8.601988993759026, vy:0, vz:0},
			{name: 'G', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:-12.0, vx:0.8411244870300862, vy:0, vz:0},
			{name: 'H', c:'#FFFFA0', r:2E7, m:5e+29, x:0, y:0, z:-13.0, vx:21.956568149319196, vy:0, vz:0},
		] } ];
}
// Compute new vx,vy and vz after dt (in seconds)
function Influence(dt) {
	function ApplyForce(obj,dtf,sgn) {
		let at = sgn * dtf/obj.m;
		obj.vx += at * dx; obj.vy +=  at * dy;  obj.vz += at * dz; }	

	if (State === null) return ;
	let list = State.items;
	for (let i = 0; i<list.length-1; i++)
		for (let j = i+1; j<list.length; j++) {			
			var dx = list[j].x - list[i].x;
			var dy = list[j].y - list[i].y;
			var dz = list[j].z - list[i].z;

			let d = Math.sqrt(dx ** 2	+ dy ** 2 + dz ** 2); // d in AU
			dx /= d; dy /= d; dz /=d; // Vector |1|

			// f = GmM/r^2. dtf = dt * f (calc optimisation)
			let dtf = dt * G * list[i].m * list[j].m / (d*d); // bidirectional force
			ApplyForce(list[i],dtf, 1); // action
			ApplyForce(list[j],dtf,-1); // reaction :)
		}
}
var InStep = false;
var State = null;
var ww, wh, wcx, wcy; // current canvas size and center
var TotTime, StepChk, StepCnt ;
// var N = 200;
export function Start(ix) {
	if (Timer) { clearInterval(Timer); Timer = null; }
	SetLS('sys', ix); 
	StepChk = 1;
	if (ix >= 0 && ix < DB.length) {
		State = JSON.parse(JSON.stringify(DB[ix])); // Deep clone
		State.ix = ix;
		if(State.fake_r !== undefined) {
			cfg.fake_r = State.fake_r; 
			document.getElementById('radius').checked = cfg.fake_r;
		}
		PopulateOrgSel();
		cfg.scale = State.scale; cfg.speed = State.speed; UpdtCfg();		
		State.items.forEach(e => {
			e.name = ENFR(e.name);
			e.x *= AU; e.y *= AU; e.z *= AU; 			//  AU to meters
			e.vx *= 1000; e.vy *= 1000; e.vz *= 1000; 	// km/s to m/s
			e.trace=[]}) 	// Create empty trace
		CenterOn(State.center);
		document.getElementById('sys').selectedIndex = ix;
		Draw();
		TotTime = 0; StepCnt = 0;
		t0 = Date.now();
		Timer = setInterval(Step, cfg_step);
	}
}
// Adjust animation timer/discretisation for CPU capabilities
function ChkStepSpeed() {
	let t1 = Date.now();
	let dtr = (t1-t0)/cfg_step; // relative error in processing time
	t0 = t1;
	if (dtr > 1.5) StepChk *= 1.07;
	else if (dtr <= 1) StepChk *= 0.99; // No difficulty dealing with the load
	let updtstep = 0;
	if (StepChk > 2) updtstep =  2;  // Need to CPU reduce the load
	else if (StepChk < 0.5) updtstep = 0.5;  // can increase the CPU load
	if (updtstep) {
		StepChk = 1; // reset cumulative/relative load
		let newstep = Math.round(cfg_step * updtstep);
		if (newstep < 10) 
			UpdtCfg('n', 1.5); // max animation speed: decrease sub dt
		else if(cfg.n > 200 && cfg_step >= 20 && updtstep > 1)
			UpdtCfg('n', 1/1.5);
		else { 
			cfg_step = newstep; 
			clearInterval(Timer);
			Timer = setInterval(Step, cfg_step); } 
		Dbug(`${1000/cfg_step} ${ENFR('frames|images')}/s, 
			${Math.round(cfg.n)} ${ENFR('calculations/frame|calculs/image')}`);		
}	}

// Animate one simulation Step called by timer
function Step() {	
	if (cfg.pause || InStep || document.hidden || TP) return;
	InStep = true;
	let dt = cfg.speed * cfg_step / 1000;	
	TotTime += dt; dt /= cfg.n;	
	Draw();
	// Do Nx Influence and Move without redraw to minimize discretization errors
	for (let n=0; n<cfg.n; n++) { 
		Influence(dt); 
		State.items.forEach(e => { 
			e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; })}
	if (StepCnt++%10 ==0) DisplayTime();
	ChkStepSpeed(); // Slow down animation for slower devices
	InStep = false;
}
function DisplayTime() {
	let days = TotTime/86400;
	var show;
	if (days>365) show = (days/365.25).toFixed(2) + ENFR(' years| ans');
	else if (days>30) show = (days/30.42).toFixed(1) + ENFR(' months| mois');	
	else if (days>1) show = days.toFixed(1) + ENFR(' days| jours');
	else show = (TotTime/3600).toFixed(1) + ENFR(' hours| heures');
	document.getElementById('time').innerHTML = show;
}
// Update GUI options and save cfg in localstorage
export function UpdtCfg(name,val) {
	if (!cfg) 
		cfg = { lang:'en', pause:false, view:'3d', trace:true, text:true, fake_r:true, scale:1, n:200 }
	if(name&&(val !== undefined)) {
		if (typeof(val) == 'string') val = val.toLowerCase()
		name = name.toLowerCase();
		if (typeof(val) === 'number') cfg[name] *= val;
		else cfg[name]=val; // boolean or string
		if (('view'.includes(name))) ClearTrace();
		if (cfg.pause) Draw();
	}	
	if (!cfg.n) cfg.n = 200;
	if (cfg.view != '3d' && cfg.view !='2d') cfg.view = '3d';
	document.getElementById(cfg.view).checked = true;
	document.getElementById('trace').checked = cfg.trace;
	document.getElementById('radius').checked = cfg.fake_r;
	document.getElementById('text').checked = cfg.text;

	let cl='pause' + (cfg.pause?' blink':'');
	let html='<div class="' + cl + '">&#x23F8;</div>';
	document.getElementById('pause').innerHTML=html;

	SetLS('cfg', JSON.stringify(cfg));
	UpdtFooter()
}
export function Pause(val) {
	if (val === undefined) val = !cfg.pause;
	cfg.pause=val;
	UpdtCfg();
}
function UpdtFooter() {
	let s = cfg.scale;
	if (s>20) s = Math.round(s);
	else if (s<1) s = s.toFixed(4);
	else s = s.toFixed(1);
	let v = Math.round(cfg.speed);
	if (v>=1e5) { v = v.toExponential(2).toString().replace('e+','E'); }
	document.getElementById('speed').innerHTML = v + ' x';
	document.getElementById('scale').innerHTML = s + ' ' +ENFR('AU|UA');
}
function GetMassCenter(set) {
	let cx=0, cy=0, cz=0, mt = 0;
	set.forEach(e=>{
		cx += e.x * e.m; cy += e.y * e.m; cz += e.z * e.m;
		mt += e.m; })
	return {'x': cx/mt, 'y': cy/mt, 'z':cz/mt}
}

// show position and speed information of object
function Details() {
	var rx,ry,rz,rvx,rvy,rvz;
	var ty, d1, d2, robj, vallst;
	const lablst = ['x', 'y', 'z', '|d|', 'vx', 'vy', 'vz', '|v|'];

	let l = 0;
	 
	let fh = Math.round(Math.max(ctx.canvas.height,ctx.canvas.width) / 60);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.font= fh + 'px Arial';
	let dx0 = ctx.measureText('WWWWWWW').width; 
	let dy0 = 20; if (touch) dy0 += 20 
	State.items.forEach((obj)=> { if(obj.details) {
		ty = Math.round(dy0 + 2.3 * l++ * fh);
		vallst = [];
		if (State.center < 0) {
			rx = obj.x - ox; ry = obj.y - oy; rz = obj.z - oz;
			rvx = obj.vx; rvy = obj.vy, rvz = obj.vz;
		} else {
			robj = State.items[State.center];
			rx = obj.x - robj.x; ry = obj.y - robj.y; rz = obj.z - robj.z;
			rvx = obj.vx - robj.vx; rvy = obj.vy  - robj.vy, rvz = obj.vz - robj.vz;
		}
		vallst.push(rx, ry, rz, Math.hypot(rx,ry,rz), rvx, rvy, rvz, Math.hypot(rvx,rvy,rvz));
		ctx.fillStyle = obj.c;
		ctx.fillText(obj.name, 10, ty);
		ctx.fillText('=>', ctx.measureText('WWWW').width + 10, ty);
		d2 = d1 = '';
		vallst.forEach((v,i)=>{
			let item = '  ' + lablst[i] + ':' + Number.parseFloat(v).toExponential(3);
			if (i<=3) d1 += item; else d2 += item;
		})
		ctx.fillText(d1, dx0, ty);
		ctx.fillText(d2, dx0, ty+fh);
	}})
}	

// for speed optimisation, a lot is done inside this 'one' function
// This is less clean 'visually' but... runs faster
function Draw() {
	if (!State) return;
	var x,y,z,r; // object coordinate conversion (space to screen)
	let line = 0;
	const full = 2 * Math.PI;

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.translate(panx, pany);

	let scale = ww/2/cfg.scale/AU;
	let rsc = 0.06 + Math.sqrt(scale) * 150; // used to gerate fake radius 
	let fh = Math.min(25,Math.max(10, ww/50/cfg.scale));

	if (State.center < 0) { 
		// re-calculate mass center in case the whole system is moving
		let center = GetMassCenter(State.items);
		ox = center.x; oy = center.y; oz = center.z; 
	} else {
		let c = State.items[State.center]; 
		ox = c.x; oy = c.y; oz = c.z; }

	State.items.forEach((e)=>{
		// relative 'space' position to reference object
		x = e.x - ox; y = oz - e.z; z = e.y - oy;  

		x = x * scale + wcx;
		if (cfg.view=='3d') y = y*COS_TETA + z*SIN_TETA;
		y = y * scale + wcy;

		// compute exagerated radius is requested
		if (cfg.fake_r && cfg.scale>0.3) r = Math.round(.05*(e.m ** rsc));
		else r = e.r * 1000 * scale; // r is given in km. Convert to AU
		if (r<1) r = 1;

		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, r, 0, full, false);
		ctx.fillStyle = e.c;
		ctx.fill();
		if (cfg.text) { 
			ctx.font= Math.floor(fh) + 'px Arial';
			ctx.fillText(e.name,x+r, y+r+fh);
		}

		// track screen 2d trace of object. (Tracking 3d does not show retrogradation)
		let tr = e.trace;
		let l = tr.length;

		// Set x and y relative to screen center for trace operation (helps zoom and pan)
		if (l == 0) 
			tr.push({x,y}); // traces are relative to screen center
		else {
			let lt = tr.slice(-1)[0]; // last item in trace
			let d = Math.sqrt((lt.x-x)**2 + (lt.y-y)**2);
			if (l == 1 && d > 0.1) 
				tr.push({x,y});
		    else if(l>1) { 
				// more than two trace points, take the decision on angle change > 1 degree
				const maxdeg = 2*Math.PI/180; // 2 degrees
				let p1 = tr[l-2];
				let p2 = tr[l-1]; // p3 is x,y
				let a1 = Math.atan2(p2.x-p1.x, p2.y-p1.y);
				let a2 = Math.atan2(x-p2.x, y-p2.y);
				if (Math.abs(a2-a1) > maxdeg || d>10) tr.push({x,y});
		}	}
		if (tr.length > MAX_TRACE) tr.shift();

		// draw trace/orbit
		if (cfg.trace && tr.length>1) {
			ctx.beginPath();
			ctx.lineWidth = 1;
			ctx.strokeStyle = e.c;
			tr.forEach(pt=>{ ctx.lineTo(pt.x, pt.y); })			
			ctx.lineTo(x,y);
			ctx.stroke();
		}
	})
	Details();
}
export function CenterOn(ix) {
	ClearTrace();
	panx = 0; pany = 0;
	// last choice is org is "center of mass"
	if (ix == State.items.length) ix = -1;
	State.center = ix;
	if (ix<0) ix = State.items.length;
	document.getElementById('org').selectedIndex = ix;
	Draw();
}
function PopulateOrgSel() {
	let html = '';
	State.items.forEach(e=>{html += '<option>' + ENFR(e.name) + '</option>'});
	html += '<option>' + ENFR('Mass Center|Ctr de G') + '</option>'
	document.getElementById('org').innerHTML = html;
}
