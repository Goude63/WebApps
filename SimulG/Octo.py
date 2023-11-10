import math;

# Generate speeds and location for octo star system (Picard S1)

AU = 1.495978707E11 # meteres
G  = 6.67E-11
# t = (x,y,z,vx,vy,vz,m)  
# Distances in AU, speeds in km/s, m in kg (mass of 2 bodies)
def Make2(t,d): # Generate one binary node
	x,y,z,vx,vy,vz,m = t
	dvx = math.sqrt((G * m)/(4*d*AU)) # convert d in meters
	dvx /= 1000 # speeds in km/s
	t1 = (x, y, z + d/2, vx-dvx, vy, vz, m/2)
	t2 = (x, y, z - d/2, vx+dvx, vy, vz, m/2)
	return [t1,t2]

def MakeJson(lst):
	json = ''
	names = 'ABCDEFGH'
	for i, e in enumerate(lst):
		x,y,z,vx,vy,vz,m = e
		json += "{name: '" + names[i] + "', c:'#FFFFA0', r:2E7, m:" + str(m)
		json += ', x:' + str(x) + ', y:' + str(y) + ', z:' + str(z)
		json += ', vx:' + str(vx) + ', vy:' + str(vy) + ', vz:' + str(vz) + '},\r\n'
	return json


n1 = Make2((0,0,0,0,0,0,4E30),20) # top level binary node
n2 = []
for t in n1: n2 += Make2(t,5) # 4 stars

n3 = []
for t in n2: n3 += Make2(t,1) # 8 starts

print(MakeJson(n3))  # to copy paste in SimuleG.js





