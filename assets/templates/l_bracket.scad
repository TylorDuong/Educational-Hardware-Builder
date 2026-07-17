// B4 printable L-bracket. Dimensions are millimetres and validated by scad-service.
arm_a = 40;
arm_b = 30;
height = 20;
thickness = 3;
hole_spacing = 20;
hole_diameter = 3;

difference() {
  union() {
    cube([arm_a, thickness, height]);
    cube([thickness, arm_b, height]);
  }
  for (x = [10, 10 + hole_spacing]) {
    translate([x, -1, height / 2]) rotate([-90, 0, 0]) cylinder(h = thickness + 2, d = hole_diameter, $fn = 32);
  }
}
