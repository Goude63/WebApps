const G = 6.67E-11;
const AU = 1.495978707E11; // 1 AU in meters
const MAX_TRACE = 400;

var cfg = { pause:false, tilt:false, trace:true, text:true, fakeR:false, scale:1 };
var Timer = null;
var InStep = false;
var lang = 'en';
var State = null;

function init() {
	canvas = document.getElementById("simulg");
	ctx = canvas.getContext("2d");
	Resize(); 
	window.addEventListener('resize', Resize)
	canvas.addEventListener('wheel', Wheel);
	canvas.addEventListener('click', Click)
	LoadDB();
	SetSysLang(); // for language
	Start(1);
}
function UpdtCfg() {
}
// String with a '|' in the middle are french|english options
function FREN(s) { let ll = s.split('|'); return (lang.toLowerCase() == 'fr' | ll.length==1)?ll[0]:ll[1]; }
function ClearTrace() {	State.items.forEach(e=>{e.trace=[]}); }
function Wheel(e) {
	let up =  e.wheelDeltaY>0;
	if (e.ctrlKey) cfg.speed *= up?2:0.5;
	else ZoomTraces((!up)?1/0.9:0.9);  
	e.preventDefault();
}

function Resize(event){ 
	// Offset traces to new screen center 
	if (State && !InStep) {		
		InStep = true;
		let dsc = window.innerWidth / ctx.canvas.width;
		let cx1 = Math.floor(ctx.canvas.width/2);
		let cy1 = Math.floor(ctx.canvas.height/2);
		let cx2 = Math.floor(window.innerWidth/2);
		let cy2 = Math.floor(window.innerHeight/2);

		State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x - cx1) * dsc + cx2; 
			pt.y = (pt.y - cy1) * dsc + cy2; 
		})})
	}
	ctx.canvas.width = window.innerWidth;
	ctx.canvas.height = window.innerHeight; 
	InStep = false;
}
// Rescale 2d traces to new zoom
function ZoomTraces(nz) {
	let wcx = Math.floor(window.innerWidth/2);
	let wcy = Math.floor(window.innerHeight/2);
	State.items.forEach(e=> { e.trace.forEach(pt=>{
			pt.x = (pt.x-wcx) / nz + wcx;
			pt.y = (pt.y-wcy) / nz + wcy;
		})})
	cfg.scale *= nz;
}
function SetSysLang(){
	let sys_list = '';
	DB.forEach((sys)=>{
		sys_list += '<option>' + FREN(sys.name) + '</option>'})
	document.getElementById('sys').innerHTML = sys_list;
	document.getElementById('labsys').innerHTML = FREN('Système|System');
}
// Distances in AU, masses in kg, speeds in km/s, radius in km
// TBD allow saving / editing in local storage
function LoadDB() {
	DB = [
		{ name:"Système Solaire|Solar System", speed:2E6, center:0, scale: 3,
		items: [
			{name:"Soleil|Sun", c:'#FFFFA0', r:695508, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0},
			{name:"Mercure|Mercury", c:'#C0C0C0', r:2440, m:3.3E23,
				x:0.3841, y:0.0472, z:0, vx:0, vy:0, vz:47.9},
			{name:"Venus", c:'#E0A0A0', r:6052, m:4.867E24,
				x:-0.7226, y:-0.0429, z:0, vx:0, vy:0, vz:-35},
			{name:"Terre|Earth", c:'#A0A0FF', r:6371, m:5.972E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0},
			{name:"Mars", c:'#F59C5A', r:3390, m:6.417E23,
				x:1.5226, y:0.0505, z:0, vx:0, vy:0, vz:24.1},
			{name:"Jupiter", c:'#F5DE9B', r:69911, m:1.898E27,
				x:5.2026, y:0.118, z:0, vx:0, vy:0, vz:13.1},
			{name:"Saturne|Saturn", c:'#DEB64B', r:58323, m:5.68E26,
				x:-9.5389, y:-0.4164, z:0, vx:0, vy:0, vz:-9.6},
			{name:"Uranus", c:'#9898B0', r:25362, m:8.681E25,
				x:0, y:0, z:-19.1821, vx:6.8, vy:0, vz:0},
			{name:"Neptune", c:'#8080B0', r:24622, m:1.024E26,
				x:-30.0405, y:-0.9425, z:0, vx:0, vy:0, vz:-5.4},
			{name:"Pluton|Pluto", c:'#F5DCCE', r:1188, m:1.3E22,
				x:47.0929, y:14.5724, z:0, vx:0, vy:0, vz:3.63}]},

		{ name:"Apollo", speed:300, center:0, scale:0.001,
		items: [
			{name:"Terre|Earth", c:'#A0A0FF', r:6378, m:5.98E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0} ,
			{name:"Soleil|Sun", c:'#FFFFA0', r:696340, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0}, 
			{name:"capsule", c:'#808080', r:0.02, m:1050,
				x:4.7E-5, y:0, z:0.999976, vx:-24.332, vy:0, vz:8.341},
			{name:"Lune|Moon", c:'#C0C0C0', r:1737, m:7.36E22,
				x:0, y:0, z:1.0026, vx:-30.82, vy:0, vz:0}]},

		{ name:"Système Binaire|Binary Star System", speed:3E5, center:-1, scale:0.75,
		items: [
			{name:"étoile 1|star 1", c:'#FFFFA0', r:696340, m:1.99E30,
				x:-0.1857, y:0, z:0, vx:0, vy:0, vz:-23},
			{name:"étoile 2|star 2", c:'#F0D090', r:450340, m:1.4E30,
				x:0.2525, y:0, z:0, vx:0, vy:0, vz:33},
			{name:"planète|planet", c:'#A0A0A0', r:450340, m:1E24,
				x:0.080, y:0, z:0, vx:25, vy:-50, vz:0}]
		} ];
}
// Compute new vx,vy and vz after delta t (dt) in seconds
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
			ApplyForce(list[i],dtf, 1);
			ApplyForce(list[j],dtf,-1);
		}
}
function Start(ix) {
	if (Timer) { clearInterval(Timer); Timer = null; }
	if (ix >= 0 && ix < DB.length) {
		State = Object.assign({}, DB[ix]); // Debug. let user choose
		cfg.scale = State.scale;
		cfg.speed = State.speed;
		State.items.forEach(e => {
			e.name = FREN(e.name);
			e.x *= AU; e.y *= AU; e.z *= AU; 			//  AU to meters
			e.vx *= 1000; e.vy *= 1000; e.vz *= 1000; 	// km/s to m/s
			e.trace=[]}) 	// Create empty trace
		if (State.center < 0) {
			let center = GetMassCenter(State.items);
			ox = center.x; oy = center.y; oz = center.z;		
		}
		document.getElementById('sys').selectedIndex = ix;
		t0 = Date.now();
		Timer = setInterval(Step, 50);		
	}
}
// Animate one simulation Step called by timer
function Step() {
	const N = 50;

	if (cfg.pause || InStep) return;

	InStep = true;
	t1 = Date.now();
	dt = cfg.speed * (t1 - t0) / 1000 / N;
	Draw();
	// Do Nx Influence and Move without redraw to minimize discretization errors
	for (let n=0; n<N; n++) { 
		Influence(dt); 
		State.items.forEach(e => { 
			e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; })}
	t0 = t1;
	InStep = false;
}
function GetMassCenter(set) {
	let cx=0, cy=0, cz=0, mt = 0;
	set.forEach(e=>{
		cx += e.x * e.m; cy += e.y * e.m; cz += e.z * e.m;
		mt += e.m; })
	return {'x': cx/mt, 'y': cy/mt, 'z':cz/mt}
}
// for speed optimisation, a lot is done inside this 'one' function
function Draw() {
	var x,y,z; // object coordinate conversion (space to screen)
	const full = 2 * Math.PI;
	
	let ww = window.innerWidth;
	let wh = window.innerHeight;
	let wcx = Math.floor(ww/2);
	let wcy = Math.floor(wh/2);

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
		y = y * scale + wcy;
		// z = (z * ww) / cfg.scale / AU + wcz; // tbd tilted view

		if (cfg.fakeR) r = Math.round(.05*(e.m ** rsc));
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
				const onedeg = Math.PI/180;
				let p1 = tr[l-2];
				let p2 = tr[l-1]; // p3 is x,y
				let a1 = Math.atan2(p2.x-p1.x, p2.y-p1.y);
				let a2 = Math.atan2(x-p2.x, y-p2.y);
				if (Math.abs(a2-a1) > onedeg || d>10) tr.push({x,y});
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
		y = y * scale + wcy;

		d = Math.sqrt((x-clk.clientX)**2 + (y-clk.clientY)**2);
		if (d < mind && d<150) {mind =d; mix = i }
	})
	// console.log(mix, mind, State.items[mix].name);
	if (mix>=0 && mix!=State.center) {
		ClearTrace();
		State.center = mix;		
	}
}

