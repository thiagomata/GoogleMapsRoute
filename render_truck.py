import bpy
import math
import os

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create low-poly truck
def create_truck():
    # Cargo area (main body)
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0.5))
    cargo = bpy.context.active_object
    cargo.scale = (1.5, 1, 0.6)
    cargo.name = "Cargo"
    
    # Cabin (front part)
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 1.2, 0.9))
    cabin = bpy.context.active_object
    cabin.scale = (1.2, 0.4, 0.4)
    cabin.name = "Cabin"
    
    # Windshield
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 1.6, 1.1))
    windshield = bpy.context.active_object
    windshield.scale = (1.0, 0.05, 0.25)
    windshield.name = "Windshield"
    
    # Wheels (4 wheels)
    wheel_positions = [(-1, -0.7, 0.2), (1, -0.7, 0.2), (-1, 0.7, 0.2), (1, 0.7, 0.2)]
    for i, pos in enumerate(wheel_positions):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.2, location=pos)
        wheel = bpy.context.active_object
        wheel.rotation_euler[0] = math.pi / 2
        wheel.name = f"Wheel_{i}"
    
    # Join all parts
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = cargo
    bpy.ops.object.join()
    
    return bpy.context.active_object

# Create materials
def create_materials(truck_obj):
    # Truck body material
    mat = bpy.data.materials.new(name="TruckBody")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = (0.2, 0.5, 0.8, 1)  # Blue
    principled.inputs['Metallic'].default_value = 0.3
    principled.inputs['Roughness'].default_value = 0.7
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    
    if truck_obj.data.materials:
        truck_obj.data.materials[0] = mat
    else:
        truck_obj.data.materials.append(mat)
    
    # Windshield material
    windshield_mat = bpy.data.materials.new(name="Windshield")
    windshield_mat.use_nodes = True
    nodes = windshield_mat.node_tree.nodes
    nodes.clear()
    
    glass = nodes.new(type='ShaderNodeBsdfGlass')
    glass.inputs['Color'].default_value = (0.9, 0.9, 1, 1)
    glass.inputs['Roughness'].default_value = 0.1
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    windshield_mat.node_tree.links.new(glass.outputs['BSDF'], output.inputs['Surface'])
    
    # Wheel material
    wheel_mat = bpy.data.materials.new(name="Wheel")
    wheel_mat.use_nodes = True
    nodes = wheel_mat.node_tree.nodes
    nodes.clear()
    
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1)  # Dark gray
    principled.inputs['Metallic'].default_value = 0.0
    principled.inputs['Roughness'].default_value = 0.9
    
    output = nodes.new(type='ShaderNodeOutputMaterial')
    wheel_mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    
    return mat, windshield_mat, wheel_mat

# Setup scene
def setup_scene():
    # Set render engine
    bpy.context.scene.render.engine = 'CYCLES'
    bpy.context.scene.cycles.samples = 128
    
    # Set output format
    bpy.context.scene.render.image_settings.file_format = 'PNG'
    bpy.context.scene.render.resolution_x = 256
    bpy.context.scene.render.resolution_y = 256
    bpy.context.scene.render.resolution_percentage = 100
    
    # Add lighting
    bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
    sun = bpy.context.active_object
    sun.data.energy = 5
    
    # Add camera
    bpy.ops.object.camera_add(location=(0, 0, 0))
    camera = bpy.context.active_object
    bpy.context.scene.camera = camera
    
    return camera

# Render from 8 angles
def render_angles(truck, camera, output_dir):
    angles = [
        ('top', 0, 90, 5),
        ('top_right', 45, 45, 5),
        ('right', 90, 0, 5),
        ('bottom_right', 135, -45, 5),
        ('bottom', 180, -90, 5),
        ('bottom_left', 225, -45, 5),
        ('left', 270, 0, 5),
        ('top_left', 315, 45, 5)
    ]
    
    # Create an empty to track
    bpy.ops.object.empty_add(location=truck.location)
    target = bpy.context.active_object
    
    # Add Track To constraint to camera
    camera.constraints.new(type='TRACK_TO')
    camera.constraints['Track To'].target = target
    camera.constraints['Track To'].track_axis = 'TRACK_NEGATIVE_Z'
    camera.constraints['Track To'].up_axis = 'UP_Y'
    
    for name, angle_y, angle_x, distance in angles:
        # Calculate camera position
        rad_y = math.radians(angle_y)
        rad_x = math.radians(angle_x)
        
        x = distance * math.sin(rad_y) * math.cos(rad_x)
        y = distance * math.cos(rad_y) * math.cos(rad_x)
        z = distance * math.sin(rad_x)
        
        camera.location = (x, y, z)
        bpy.context.view_layer.update()
        
        # Render
        output_path = os.path.join(output_dir, f"{name}.png")
        bpy.context.scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {name} to {output_path}")
    
    # Cleanup
    bpy.ops.object.select_all(action='DESELECT')
    target.select_set(True)
    bpy.ops.object.delete()

# Main execution
output_dir = "/Users/thiagomata/github/thiagomata/GoogleMapsRoute/images/renders"
os.makedirs(output_dir, exist_ok=True)

truck = create_truck()
camera = setup_scene()
render_angles(truck, camera, output_dir)

print("Rendering complete!")
