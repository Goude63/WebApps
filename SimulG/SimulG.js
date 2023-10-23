const G = 6.67E-11;
const AU = 1.495978707E11; // 1 AU in meters

var cfg = { pause:false, turbo:false, tilt:false, trace:false, text:true, fakeR:true };
var Timer = null;
var InStep = false;

function init() {
	canvas = document.getElementById("simulg");
	ctx = canvas.getContext("2d");
	ctx.canvas.width  = window.innerWidth;
	ctx.canvas.height = window.innerHeight;
	LoadDB();
	let sys_list = '';
	DB.forEach((sys)=>{
		sys_list += '<option>' + sys.name + '</option>'})
	document.getElementById('sys').innerHTML = sys_list;
	Run(2);
}

// Distances in AU, masses in kg, speeds in km/s, radius in km
// TBD allow saving / editing in local storage
function LoadDB() {
	DB = [
		{ name:"Système Solaire", speed:2E6, center:0, scale: 3,
		items: [
			{name:"Soleil", c:'#C0FFFF', tr: 500, r:695508, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0},
			{name:"Mercure", c:'#C0C0FF', tr: 500, r:2440, m:3.3E23,
				x:0.3841, y:0.0472, z:0, vx:0, vy:0, vz:47.9},
			{name:"Venus", c:'#FFC0C0', tr: 500, r:6052, m:4.867E24,
				x:-0.7226, y:-0.0429, z:0, vx:0, vy:0, vz:-35},
			{name:"Terre", c:'#FFC080', tr: 500, r:6371, m:5.972E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0},
			{name:"Mars", c:'#003080', tr: 500, r:3390, m:6.417E23,
				x:1.5226, y:0.0505, z:0, vx:0, vy:0, vz:24.1},
			{name:"Jupiter", c:'#C04080', tr: 800, r:69911, m:1.898E27,
				x:5.2026, y:0.118, z:0, vx:0, vy:0, vz:13.1},
			{name:"Saturne", c:'#D0D0D0', tr: 1700, r:58323, m:5.68E26,
				x:-9.5389, y:-0.4164, z:0, vx:0, vy:0, vz:-9.6},
			{name:"Uranus", c:'#808030', tr: 1200, r:25362, m:8.681E25,
				x:0, y:0, z:-19.1821, vx:6.8, vy:0, vz:0},
			{name:"Neptune", c:'#C04040', tr: 1200, r:24622, m:1.024E26,
				x:-30.0405, y:-0.9425, z:0, vx:0, vy:0, vz:-5.4},
			{name:"Pluton", c:'#505050', tr: 1500, r:1188, m:1.3E22,
				x:47.0929, y:14.5724, z:0, vx:0, vy:0, vz:3.63}]},

		{ name:"Apollo", speed:500, center:0, scale:0.005,
		items: [
			{name:"Terre", c:'#FFC080', tr: 1000, r:6378, m:5.98E24,
				x:0, y:0, z:1, vx:-29.8, vy:0, vz:0} ,
			{name:"Soleil", c:'#C0FFFF', tr: 500, r:696340, m:1.99E30,
				x:0, y:0, z:0, vx:0, vy:0, vz:0}, 
			{name:"capsule", c:'#808080', tr: 2000, r:0.02, m:1050,
				x:4.7E-5, y:0, z:0.999976, vx:-24.332, vy:0, vz:8.341},
			{name:"Lune", c:'#C0C0C0', tr: 500, r:1737, m:7.36E22,
				x:0, y:0, z:1.0026, vx:-30.82, vy:0, vz:0}]},

		{ name:"Système Binaire", speed:3E5, center:-1, scale:0.75,
		items: [
			{name:"étoile 1", c:'#C0FFFF', tr: 500, r:696340, m:1.99E30,
				x:-0.1857, y:0, z:0, vx:0, vy:0, vz:-23},
			{name:"étoile 2", c:'#B0DFDF', tr: 500, r:450340, m:1.4E30,
				x:0.2525, y:0, z:0, vx:0, vy:0, vz:33},
			{name:"planète", c:'#FFC080', tr: 500, r:450340, m:1E24,
				x:0.080, y:0, z:0, vx:25, vy:-50, vz:0}]
		} ];
}

// Compute new vx,vy and vz after delta t (dt) in seconds
function Influence(dt) {
	if (State === null) return ;
	let list = State.items;
	for (let i = 0; i<list.length-1; i++)
		for (let j = i+1; j<list.length; j++) {			
			let dx = list[j].x - list[i].x;
			let dy = list[j].y - list[i].y;
			let dz = list[j].z - list[i].z;

			let d = Math.sqrt(dx ** 2	+ dy ** 2 + dz ** 2); // d in AU
			dx /= d; dy /= d; dz /=d; // Vector |1|

			// f = GmM/r^2. dtf = dt * f (calc optimisation)
			let dtf = dt * G * list[i].m * list[j].m / (d*d); // bidirectional force
			ApplyForce(list[i],dtf, dx, dy, dz)
			ApplyForce(list[j],dtf,-dx,-dy,-dz)
		}
}
function ApplyForce(obj,dtf,ux,uy,uz) {
	let at = dtf/obj.m;
	obj.vx += at * ux; obj.vy +=  at * uy;  obj.vz += at * uz;
}

// Move objects according to their speeds 
function Move(dt) {
	State.items.forEach(e => { 
		e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; 
		let l = e.trace.slice(-1)
		let mv = Math.sqrt((l.x-e.x)**2 + (l.y-e.y)**2 + (l.z-e.z)**2);
		if (mv>e.r) {
			if (e.trace.length >= e.tr) e.trace.shift();
			this.trace.push()
		}
	});
}

function Run(ix) {
	if (Timer) {
		clearInterval(Timer);
		Timer = null;
	}
	if (ix >= 0 && ix < DB.length) {
		State = Object.assign({}, DB[ix]); // Debug. let user choose
		State.items.forEach(e => {
			e.x *= AU; e.y *= AU; e.z *= AU; // convert AU to meters
			e.vx *= 1000; e.vy *= 1000; e.vz *= 1000;
			e.trace=[{x:e.x,y:e.y,z:e.z}]})  // Add position in trace
		if (State.center < 0) {
			let center = GetMassCenter(State.items);
			ox = center.x; oy = center.y; oz = center.z;		
		}		
		t0 = Date.now();
		Timer = setInterval(Step, 50);		
	}
}

// Animate one simulation Step called by timer
function Step() {
	const N = 10;
	if (InStep) return;  // prevent recursive entry if processing takes more than 100ms
	InStep = true;
	t1 = Date.now();
	dt = State.speed * (t1 - t0) / 1000 / N;
	Draw();
	for (let n=0; n<N; n++) {
		Influence(dt);
		Move(dt);
	}
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

// for speed optimisation, a lot is done inside this function
function Draw() {
	var x,y,z; // object coordinate conversion (space to screen)
	const full = 2 * Math.PI;
	
	let ww = window.innerWidth;
	let wh = window.innerHeight;
	let fh = wh/60;
	ctx.font= Math.floor(fh) + 'px serif';
	let wcx = Math.floor(ww/2);
	let wcy = Math.floor(wh/2);

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let scale = ww/2/State.scale/AU;

	if (State.center >=0) {
		let cobj = State.items[State.center];
		ox = cobj.x; oy = cobj.y; oz = cobj.z;			
	}
	State.items.forEach((e,i)=>{
		x = e.x - ox; y = oz - e.z; z = e.y - oy;  // space relative to reference object
		
		x = x * scale + wcx;
		y = y * scale + wcy;
		// z = (z * ww) / cfg.scale / AU + wcz; // tbd tilted view
		r = e.r * 1000 * scale; // r is given in km. Convert to AU
		if (r<1) r = 1;

		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.arc(x, y, r, 0, full, false);
		ctx.fillStyle = e.c;
		ctx.fill();

		ctx.fillText(e.name,x+r+r, y+fh);			
	})
}

function UpdtCfg() {

}