const G = 6.67E-11;
const AU = 1.495978707E11; // 1 AU in meters
const MAX_TRACE = 600;
const TILT_RAD = -Math.PI*70/180;
const SIN_TETA = Math.sin(TILT_RAD); // 30 degr tilt in radian
const COS_TETA = Math.cos(TILT_RAD); 
var cfg; 

function init() {
	canvas = document.getElementById("simulg");
	ctx = canvas.getContext("2d");
	try   {cfg = JSON.parse(GetLS('cfg', JSON.stringify(cfg)))}
	catch {};
	cfg_step = 20; 
	UpdtCfg(); // save and update GUI 

	window.addEventListener('resize', Resize)
	canvas.addEventListener('wheel', Wheel);
	canvas.addEventListener('click', Click)
	window.addEventListener('keydown', KeyDown)
	LoadDB();
	SetSysLang(); // for language 
	DoResize();
	Start(GetLS('sys',0));
	Resize();
}
function SetLS(name,v) { localStorage.setItem('SG_' + name, v) }
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
	else ZoomTraces((!up)?1/0.9:0.9);  
	e.preventDefault();
	if (cfg.pause) Draw()
	UpdtFooter();;
}
var ResTo = null;
function Resize(){ clearTimeout(ResTo);	ResTo = setTimeout(DoResize, 100); }
function DoResize() {
	// Offset traces to new screen center 
	let hdr = document.getElementById('header');
	let ftr = document.getElementById('footer');
	let CVH = window.innerHeight - hdr.offsetHeight - ftr.offsetHeight;
	CVH -= ftr.getBoundingClientRect().top - canvas.getBoundingClientRect().bottom;
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
	wcx = Math.floor(ww/2);  // window center
	wcy = Math.floor(wh/2);
	if (cfg.pause) Draw();
}
function Help() {
	window.open('Help_' + cfg.lang + '.htm', 'help').focus();
}
// Rescale 2d traces to new zoom
function ZoomTraces(nz) {
	State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x-wcx) / nz + wcx;
			pt.y = (pt.y-wcy) / nz + wcy;
		})})
	cfg.scale *= nz;
	UpdtFooter();
}
function KeyDown(kev) {
	let key = kev.key.toLowerCase(); 
	if(key == ' ') { Pause(); return }
	let ud = '+-'.indexOf(key); 
	if (ud >= 0) {
		if (kev.ctrlKey) cfg.speed *= (ud==0)?2:0.5;
		else ZoomTraces((ud==1)?1/0.9:0.9);  
		kev.preventDefault();
		if (cfg.pause) Draw()
		UpdtFooter(); }
	else if ('na'.includes(key)) UpdtCfg('text', !cfg.text);
	else if ('ot'.includes(key)) UpdtCfg('trace', !cfg.trace);
	else if (key=='r') UpdtCfg('fake_r', !cfg.fake_r);
	else if (key=='2') UpdtCfg('view', '2d');
	else if (key=='3') UpdtCfg('view', '3d');
	else if (kev.code=='PageDown') Start((gix+1)%DB.length);
	else if (kev.code=='PageUp')   Start((gix+DB.length-1)%DB.length);
}
function SetSysLang(newLang) {
	let sys_list = '';
	if (newLang) { UpdtCfg('lang',newLang) }
	if (!cfg.lang) cfg.lang = 'en';
	document.getElementById('lang').value = cfg.lang.toUpperCase();
	DB.forEach((sys)=>{sys_list += '<option>' + ENFR(sys.name) + '</option>'})
	document.getElementById('sys').innerHTML = sys_list;
	document.getElementById('labsys').innerHTML = ENFR('System:|Système:');
	document.getElementById('laborg').innerHTML = ENFR('Center:|Centre:');
	document.getElementById('view').innerHTML = ENFR('View:|Vue:');
	document.getElementById('labtop').innerHTML = ENFR('2d');
	document.getElementById('lab3d').innerHTML = ENFR('3d');
	document.getElementById('org').title = 
		ENFR("You can also [ctrl] click on the object|Vous pouvez aussi faire [ctrl] clic sur l'objet");
	document.getElementById('radius').title = 
		ENFR("Show exagerated radius|Montrer un rayon exagéré ");
	document.getElementById('labtime').innerHTML = ENFR('Duration:|Durée:');
	document.getElementById('labspeed').innerHTML = ENFR('Speed:|Vitesse:');
	if (State) Start(State.ix);
}
function LoadDB() {
	// Distances in AU, masses in kg, speeds in km/s, radius in km
	DB = [
		{ name:"Solar System|Système Solaire", speed:2E6, center:-1, scale: 50,
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

		{ name:"Terrestrial Planets|Planètes terrestres", speed:2E6, center:-1, scale: 3,
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
		
		{ name:"Apollo", speed:6000, center:0, scale:0.002, fake_r:false,
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
				x:0.080, y:0, z:0, vx:25, vy:-50, vz:0}]
		} ];
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

var Timer = null;
var InStep = false;
var State = null;
var ww, wh, wcx, wcy; // current canvas size and center
var TotTime, StepChk;
var gix = 0;
// var N = 200;
function Start(ix) {
	if (Timer) { clearInterval(Timer); Timer = null; }
	SetLS('sys', ix); 
	StepChk = 1;
	if (ix >= 0 && ix < DB.length) {
		gix = ix;
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
			UpdtCfg('n', Math.round(cfg.n*1.5)); // max animation speed: decrease sub dt
		else if(cfg.n > 200 && cfg_step >= 20 && updtstep > 1)
			UpdtCfg('n', Math.round(cfg.n/1.5));
		else { 
			cfg_step = newstep; 
			clearInterval(Timer);
			Timer = setInterval(Step, cfg_step); } 
		document.getElementById('dbug').innerHTML = 't:' + cfg_step +'ms, n:'+ cfg.n;
}	}

// Animate one simulation Step called by timer
function Step() {	
	if (cfg.pause || InStep) return;
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
function UpdtCfg(name,val) {
	if (!cfg) 
		cfg = { lang:'en', pause:false, view:'3d', trace:true, text:true, fake_r:true, scale:1, n:200 }
	if(name&&(val !== undefined)) {
		if (typeof(val) == 'string') val = val.toLowerCase()
		name = name.toLowerCase()
		cfg[name]=val;
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
	html='<div class="' + cl + '">&#x23F8;</div>';
	document.getElementById('pause').innerHTML=html;

	SetLS('cfg', JSON.stringify(cfg));
	UpdtFooter()
}

function Pause(val) {
	if (val == undefined) val = !cfg.pause;
	cfg.pause=val;
	UpdtCfg();
}
function UpdtFooter() {
	document.getElementById('speed').innerHTML = Math.round(cfg.speed) + ':1';
	document.getElementById('scale').innerHTML = (cfg.scale).toFixed(1) + ' ' +ENFR('AU|UA');
}

function GetMassCenter(set) {
	let cx=0, cy=0, cz=0, mt = 0;
	set.forEach(e=>{
		cx += e.x * e.m; cy += e.y * e.m; cz += e.z * e.m;
		mt += e.m; })
	return {'x': cx/mt, 'y': cy/mt, 'z':cz/mt}
}
// for speed optimisation, a lot is done inside this 'one' function
// This is less clean 'visually' but 
function Draw() {
	if (!State) return;
	var x,y,z; // object coordinate conversion (space to screen)
	const full = 2 * Math.PI;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let scale = ww/2/cfg.scale/AU;
	let rsc = 0.06 + Math.sqrt(scale) * 150; // used to gerate fake radius 
	let fh = Math.min(25,Math.max(10, ww/50/cfg.scale));

	ctx.font= Math.floor(fh) + 'px Arial';

	if (State.center < 0) {
		let center = GetMassCenter(State.items);
		ox = center.x; oy = center.y; oz = center.z; 
	} else {
		let c = State.items[State.center]; 
		ox = c.x; oy = c.y; oz = c.z; }

	State.items.forEach((e)=>{
		x = e.x - ox; y = oz - e.z; z = e.y - oy;  // space relative to reference object

		x = x * scale + wcx;
		if (cfg.view=='3d') y = y*COS_TETA + z*SIN_TETA;
		y = y * scale + wcy;

		// compute radius
		if (cfg.fake_r) r = Math.round(.05*(e.m ** rsc));
		else r = e.r * 1000 * scale; // r is given in km. Convert to AU
		if (r<1) r = 1;

		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, r, 0, full, false);
		ctx.fillStyle = e.c;
		ctx.fill();

		// track screen 2d trace of object. (Tracking 3d does not show retrogradation)
		let tr = e.trace;
		let l = tr.length;
		if (l == 0) tr.push({x,y});
		else {
			let lt = tr.slice(-1)[0]; // last item in trace
			let d = Math.sqrt((lt.x-x)**2 + (lt.y-y)**2);
			if (l == 1 && d >= 2) tr.push({x,y});
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
		if (cfg.text) ctx.fillText(e.name,x+r, y+r+fh);			

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
}

// Find closest object and set as center
function Click(clk) {
	if (clk.button)
	var x,y,z,d; // object coordinate conversion (space to screen)
	let scale = ww/2/cfg.scale/AU;
	let mind = 1E500, mix = -1;

	State.items.forEach((e,i)=>{
		x = e.x - ox; y = oz - e.z; z = e.y - oy;  // space relative to reference object		
		x = x * scale + wcx;
		if (cfg.view=='3d') y = y*COS_TETA + z*SIN_TETA;
		y = y * scale + wcy;

		d = Math.sqrt((x-clk.clientX)**2 + (y-clk.clientY)**2);
		if (d < mind && d<100) {mind =d; mix = i }
	})
	// console.log(mix, mind, State.items[mix].name);

	let prev = false;
	if (mix>=0) {
		prev = true;
		if(clk.ctrlKey && mix!=State.center) CenterOn(mix);
		else if(clk.ctrlKey) {
		}// Diplay object info TBD}
		else prev = false;		
	}
	if (prev) clk.preventDefault();
}

function CenterOn(ix) {
	ClearTrace();
	// last choice is org is "center of mass"
	if (ix == State.items.length) ix = -1;
	State.center = ix;
	if (ix<0) ix = State.items.length;
	document.getElementById('org').selectedIndex = ix;
}

function PopulateOrgSel() {
	let html = '';
	State.items.forEach(e=>{html += '<option>' + ENFR(e.name) + '</option>'});
	html += '<option>' + ENFR('Mass Center|Ctr de G') + '</option>'
	document.getElementById('org').innerHTML = html;
}

