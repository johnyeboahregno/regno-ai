# ROS (Robot Operating System)

> Technology standard for "ROS Developer" agents. Sources: ROS 2 docs, REP-2004, ROS 2 design.

## Architecture

- Nodes as single-responsibility units; communicate via topics/services/actions
- Prefer **ROS 2** (humble/jazzy) over ROS 1
- Define interfaces in a dedicated package (`.msg`, `.srv`, `.action`)

## Quality

- `colcon build` with `--symlink-install` for dev
- `ament_*` linters (`ament_cpplint`, `ament_flake8`, `ament_uncrustify`) in CI
- CMake or ament_python with pinned deps

## Testing

- Unit: gtest (C++) / pytest (Python)
- Integration: `launch_testing` to bring up nodes + assert behaviour
- Simulation-in-the-loop: Gazebo for integration before hardware

## Performance

- Respect real-time constraints: real-time-safe executors, no allocations in callbacks
- Use QoS profiles deliberately (sensor data vs. commands)
- `ros2 topic hz` / `rqt_graph` for observability

## Safety & CI/CD

- Hardware tests gated and manual; software CI on every push
- Version interfaces (ROS IDL) and check compatibility
- Log with `RCLCPP_*`; use `rosbag2` for replayable data
