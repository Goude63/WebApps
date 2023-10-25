const G = 6.67E-11;
const AU = 1.495978707E11; // 1 AU in meters
const MAX_TRACE = 600;
const TILT_RAD = -Math.PI*70/180;
const SIN_TETA = Math.sin(TILT_RAD); // 30 degr tilt in radian
const COS_TETA = Math.cos(TILT_RAD); 

var cfg = { lang:'en', pause:false, view:'3d', trace:true, 
			text:true, fake_r:false, scale:1, step:50 }; // animation step in ms
var Timer = null;
var InStep = false;
var State = null;
var ww, wh, wcx, wcy; // current canvas size and center
var TotTime, StepCnt;

function init() {
	canvas = document.getElementById("simulg");
	ctx = canvas.getContext("2d");
	cfg = JSON.parse(GetLS('cfg', JSON.stringify(cfg)));
	if (!cfg.step) cfg.step = 50;
	cfg.step = 10;
	if (cfg.view != '3d' && cfg.view !='top') cfg.view = '3d';
	document.getElementById(cfg.view).checked = true;
	document.getElementById('trace').checked = cfg.trace;
	document.getElementById('radius').checked = cfg.fake_r;
	// UpdtCfg();
	DoResize(); 	
	window.addEventListener('resize', Resize)
	canvas.addEventListener('wheel', Wheel);
	canvas.addEventListener('click', Click)
	LoadDB();
	SetSysLang(); // for language
	Start(GetLS('sys',0));
}
function SetLS(name,v) { localStorage.setItem('SG_' + name, v) }
function GetLS(name,def) {
	name = 'SG_' + name;
	let v = localStorage.getItem(name);
	if (v===undefined || v === null) v = def;
	return v; }

// String with a '|' in the middle are french|english options
function ENFR(s) { let ll = s.split('|'); return (cfg.lang.toLowerCase() == 'en' | ll.length==1)?ll[0]:ll[1]; }
function ClearTrace() {	State.items.forEach(e=>{e.trace=[]}); }
function Wheel(e) {
	let up =  e.wheelDeltaY>0;
	if (e.ctrlKey) cfg.speed *= up?2:0.5;
	else ZoomTraces((!up)?1/0.9:0.9);  
	e.preventDefault();
	UpdtFooter();
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
}
// Rescale 2d traces to new zoom
function ZoomTraces(nz) {
	State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x-wcx) / nz + wcx;
			pt.y = (pt.y-wcy) / nz + wcy;
		})})
	cfg.scale *= nz;
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
	document.getElementById('labtop').innerHTML = ENFR('Top|Dessus');
	document.getElementById('lab3d').innerHTML = ENFR('3d');
	document.getElementById('org').title = 
		ENFR("You can also [ctrl] click on the object|Vous pouvez aussi faire [ctrl] clic sur l'objet");
	document.getElementById('radius').title = 
		ENFR("Show exagerated radius|Montrer un rayon exagéré ");
	document.getElementById('labtime').innerHTML = ENFR('Time elapsed:|Temps écoulé:');
	document.getElementById('labspeed').innerHTML = ENFR('Speed:|Vitesse:');
	if (State) Start(State.ix);
}
// Distances in AU, masses in kg, speeds in km/s, radius in km
// TBD allow saving / editing in local storage
function LoadDB() {
	DB = [
		{ name:"Solar System|Système Solaire", speed:2E6, center:0, scale: 50,
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

		{ name:"Terrestrial Planets|Planètes terrestres", speed:2E6, center:0, scale: 3,
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

		{ name:"Jovian Planets|Planètes joviennes", speed:5E7, center:0, scale: 60,
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
		
		{ name:"Apollo", speed:300, center:0, scale:0.002, fake_r:false,
		items: [
			{name:"Earth|Terre", c:'#A0A0FF', r:6378, m:5.98E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0} ,
			{name:"Sun|Soleil", c:'#FFFFA0', r:696340, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0}, 
			{name:"capsule", c:'#808080', r:0.02, m:1050,
				x:4.7E-5, y:0, z:0.999976, vx:-24.332, vy:0, vz:8.341},
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
function Start(ix) {
	if (Timer) { clearInterval(Timer); Timer = null; }
	SetLS('sys', ix); 
	if (ix >= 0 && ix < DB.length) {
		State = JSON.parse(JSON.stringify(DB[ix])); // Deep clone
		State.ix = ix;
		if(State.fake_r !== undefined) {
			cfg.fake_r = State.fake_r; 
			document.getElementById('radius').checked = cfg.fake_r;
		}
		PopulateOrgSel();
		cfg.scale = State.scale; cfg.speed = State.speed;
		UpdtCfg();
		State.items.forEach(e => {
			e.name = ENFR(e.name);
			e.x *= AU; e.y *= AU; e.z *= AU; 			//  AU to meters
			e.vx *= 1000; e.vy *= 1000; e.vz *= 1000; 	// km/s to m/s
			e.trace=[]}) 	// Create empty trace
		CenterOn(State.center);
		document.getElementById('sys').selectedIndex = ix;
		TotTime = 0; StepCnt = 0;
		t0 = Date.now();
		Timer = setInterval(Step, cfg.step);
	}
}
// Animate one simulation Step called by timer
function Step() {
	const N = 200;
	if (cfg.pause || InStep) return;

	InStep = true;
	let t1 = Date.now();
	let dt = cfg.speed * cfg.step / 1000;
	// console.log(t1-t0);
	TotTime += dt;
	dt /= N;
	Draw();
	// Do Nx Influence and Move without redraw to minimize discretization errors
	for (let n=0; n<N; n++) { 
		Influence(dt); 
		State.items.forEach(e => { 
			e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; })}
	t0 = t1;
	if (StepCnt%10 ==0) DisplayTime();
	StepCnt += 1;
	InStep = false;
}

function DisplayTime() {
	let days = TotTime/86400;
	var show;
	if (days>365) show = (days/365.25).toFixed(2) + ENFR(' years| ans');
	else if (days>30) show = (days/30.42).toFixed(1) + ENFR(' months| mois');	
	else if (days>1) show = days.toFixed(1) + ENFR(' days| jours');
	else show = (TotTime/3600).toFixed(1) + ENFR(' hours| heures');
	document.getElementById('time').value = show;
}

function UpdtCfg(name,val) {
	if(name&&(val !== undefined)) {
		if (typeof(val) == 'string') val = val.toLowerCase()
		name = name.toLowerCase()
		cfg[name]=val;
		if (!('trace|fake_r'.includes(name))) ClearTrace();
	}
	SetLS('cfg', JSON.stringify(cfg));
	UpdtFooter()
}
function UpdtFooter() {
	document.getElementById('speed').value = Math.round(cfg.speed) + ':1'; 
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
	var x,y,z; // object coordinate conversion (space to screen)
	const full = 2 * Math.PI;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let scale = ww/2/cfg.scale/AU;
	let rsc = 0.06 + Math.sqrt(scale) * 150; // used to gerate fake radius 
	let fh = Math.min(30,Math.max(10, ww/100/cfg.scale));
	ctx.font= Math.floor(fh) + 'px serif';

	if (State.center >=0) {
		let c = State.items[State.center]; ox = c.x; oy = c.y; oz = c.z; }

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

		// track screen 2d trace of object. Tracking 3d does not show retrogradation
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
			ctx.stroke();
		}
	})
}

// Find closest object and set as center
function Click(clk) {
	if (clk.button)
	var x,y,z,d; // object coordinate conversion (space to screen)
	let ww = window.innerWidth;
	let wh = window.innerHeight;
	let wcx = Math.floor(ww/2);
	let wcy = Math.floor(wh/2);
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

	let cancel = false;
	if (mix>=0) {
		cancel = true;
		if(clk.ctrlKey && mix!=State.center) CenterOn(mix);
		else if(clk.ctrlKey) {
		}// Diplay object info TBD}
		else cancel = false;		
	}
	if (cancel) clk.preventDefault();
}

function CenterOn(ix) {
	ClearTrace();
	// last choice is org is "center of mass"
	if (ix < 0 || ix == State.items.length) { 
		let center = GetMassCenter(State.items);
		ox = center.x; oy = center.y; oz = center.z; 
		ix = -1;
	}
	State.center = ix;
	if (ix<0) ix = State.items.length;
	document.getElementById('org').selectedIndex = ix;
}

function PopulateOrgSel() {
	let html = '';
	State.items.forEach(e=>{html += '<option>' + ENFR(e.name) + '</option>'});
	html += '<option>' + ENFR('Mass Center|Centre de masse') + '</option>'
	document.getElementById('org').innerHTML = html;
}

