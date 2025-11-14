const { userModel } = require("../model/user.model");
const bcrypt = require("bcryptjs"); // Thêm
const jwt = require("jsonwebtoken"); // Thêm
// Xem danh sách tất cả users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find().select("-password");
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách users",
      error: error.message,
    });
  }
};

// Xem chi tiết một user theo ID
exports.getUserById = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy chi tiết user",
      error: error.message,
    });
  }
};

// Tạo user mới (đăng ký)
exports.createUser = async (req, res) => {
  try {
    const { username, password, role, name, phoneNumber, email, isActive } =
      req.body;

    // Kiểm tra username đã tồn tại chưa
    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Username đã tồn tại",
      });
    }

    // Mã hóa password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      username,
      password: hashedPassword, // Lưu password đã mã hóa
      role,
      name,
      phoneNumber,
      email,
      isActive: isActive !== undefined ? isActive : true,
    });

    await newUser.save();

    // Không trả về password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "Tạo user thành công",
      data: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo user",
      error: error.message,
    });
  }
};

// Cập nhật user theo ID
exports.updateUser = async (req, res) => {
  try {
    const {username, name, phoneNumber, email, role, isActive, password } = req.body;

    const updateData = {
      name,
      phoneNumber,
      email,
      role,
      isActive,
      username
    };

    // Nếu có cập nhật password, mã hóa nó
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await userModel
      .findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật user thành công",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật user",
      error: error.message,
    });
  }
};

// Xóa user theo ID
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await userModel
      .findByIdAndDelete(req.params.id)
      .select("-password");
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }
    res.status(200).json({
      success: true,
      message: "Xóa user thành công",
      data: deletedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa user",
      error: error.message,
    });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Kiểm tra username có tồn tại không
    const user = await userModel.findOne({ username });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Sai username hoặc password", // Thông báo chung
      });
    }

    // 2. So sánh password (password người dùng gửi vs password đã hash trong DB)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Sai username hoặc password",
      });
    }

    // 3. Nếu đúng, tạo JWT payload
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };

    // 4. Ký và tạo token
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Lấy từ file .env
      { expiresIn: "7d" }, // Token hết hạn sau 7 ngày
      (err, token) => {
        if (err) throw err;

        // 5. Trả về token và thông tin user (loại bỏ password)
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
          success: true,
          message: "Đăng nhập thành công",
          token: token,
          user: userResponse,
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng nhập",
      error: error.message,
    });
  }
};
