motor_count = 4;
wheelbase_mm = 250;
arm_width_mm = 18;
arm_thickness_mm = 6;
hub_size_mm = 70;
hub_thickness_mm = 8;
motor_mount_od_mm = 28;
motor_mount_id_mm = 10;
motor_hole_circle_mm = 16;
motor_hole_d_mm = 2.2;
wall_mm = 2.2;
ducted = 0;
duct_od_mm = 55;
duct_height_mm = 18;
battery_l_mm = 90;
battery_w_mm = 40;
battery_h_mm = 28;
landing_gear = 1;
gear_height_mm = 35;
fc_hole_pitch_mm = 30.5;
fc_hole_d_mm = 3.2;
$fn = $preview ? 36 : 72;

arm_span = wheelbase_mm / 2;
hub_r = hub_size_mm / 2;

module motor_plate() {
    difference() {
        cylinder(h = arm_thickness_mm, d = motor_mount_od_mm, center = true);
        cylinder(h = arm_thickness_mm + 2, d = motor_mount_id_mm, center = true);
        for (a = [0:90:270])
            rotate([0, 0, a])
                translate([motor_hole_circle_mm / 2, 0, 0])
                    cylinder(h = arm_thickness_mm + 2, d = motor_hole_d_mm, center = true);
    }
}

module duct() {
    if (ducted > 0) {
        translate([0, 0, duct_height_mm / 2 - arm_thickness_mm / 2])
            difference() {
                cylinder(h = duct_height_mm, d = duct_od_mm, center = true);
                cylinder(h = duct_height_mm + 2, d = duct_od_mm - 2 * wall_mm, center = true);
            }
    }
}

module arm_beam() {
    hull() {
        translate([hub_r * 0.55, 0, 0])
            cube([1, arm_width_mm, arm_thickness_mm], center = true);
        translate([arm_span - motor_mount_od_mm / 2, 0, 0])
            cube([1, arm_width_mm * 0.85, arm_thickness_mm], center = true);
    }
}

module one_arm() {
    union() {
        arm_beam();
        translate([arm_span, 0, 0]) {
            motor_plate();
            duct();
        }
    }
}

module hub() {
    difference() {
        union() {
            cylinder(h = hub_thickness_mm, d = hub_size_mm, center = true);
            translate([0, 0, -hub_thickness_mm / 2 - battery_h_mm / 2])
                cube([battery_l_mm + 2 * wall_mm, battery_w_mm + 2 * wall_mm, battery_h_mm], center = true);
        }
        translate([0, 0, -hub_thickness_mm / 2 - battery_h_mm / 2])
            cube([battery_l_mm, battery_w_mm, battery_h_mm + 0.2], center = true);
        for (x = [-1, 1], y = [-1, 1])
            translate([x * fc_hole_pitch_mm / 2, y * fc_hole_pitch_mm / 2, 0])
                cylinder(h = hub_thickness_mm + 2, d = fc_hole_d_mm, center = true);
        cylinder(h = hub_thickness_mm + 2, d = 12, center = true);
    }
}

module skid() {
    if (landing_gear > 0) {
        for (side = [-1, 1]) {
            translate([0, side * (battery_w_mm / 2 + wall_mm + 6), -gear_height_mm / 2 - hub_thickness_mm / 2]) {
                cube([battery_l_mm * 0.7, wall_mm * 1.4, gear_height_mm], center = true);
                translate([0, 0, -gear_height_mm / 2])
                    rotate([0, 90, 0])
                        cylinder(h = battery_l_mm * 0.85, d = wall_mm * 2.2, center = true);
            }
        }
    }
}

module genesis_multirotor() {
    union() {
        hub();
        skid();
        for (i = [0:motor_count - 1]) {
            rotate([0, 0, i * 360 / motor_count + (motor_count == 4 ? 45 : 0)])
                one_arm();
        }
    }
}
