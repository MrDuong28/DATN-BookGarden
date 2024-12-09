import React, { useState, useEffect } from "react";
import styles from "./pay.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import userApi from "../../../apis/userApi";
import productApi from "../../../apis/productApi";
import { useHistory } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { Col, Row, Tag, Spin, Card } from "antd";
import { DateTime } from "../../../utils/dateTime";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import {
  Typography,
  Button,
  Steps,
  Breadcrumb,
  Modal,
  notification,
  Form,
  Input,
  Select,
  Radio,
} from "antd";
import { LeftSquareOutlined } from "@ant-design/icons";

import Slider from "react-slick";
import axios from "axios";

const { Meta } = Card;
const { Option } = Select;

const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;

const Pay = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderTotal, setOrderTotal] = useState([]);
  const [visible, setVisible] = useState(false);
  const [dataForm, setDataForm] = useState([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentId = queryParams.get("paymentId");
  const [lengthForm, setLengthForm] = useState();
  const [form] = Form.useForm();
  const [template_feedback, setTemplateFeedback] = useState();
  let { id } = useParams();
  const history = useHistory();
  const [showModal, setShowModal] = useState(false);
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const hideModal = () => {
    setVisible(false);
  };
  const [totalFee, setTotalFee] = useState(0);

  const accountCreate = async (values) => {
    console.log(values, "values");
    if (values.billing === "paypal") {
      localStorage.setItem("description", values.description);
      localStorage.setItem("address", values.address);
      try {
        const approvalUrl = await handlePayment(values);
        console.log(approvalUrl);
        if (approvalUrl) {
          window.location.href = approvalUrl; // Chuyển hướng đến URL thanh toán PayPal
        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }
    } else {
      try {
        const formatData = {
          userId: userData._id,
          address: values.address,
          billing: values.billing,
          description: values.description,
          status: "pending",
          products: productDetail,
          orderTotal: Number(totalPrice) + Number(totalFee),
        };

        console.log(formatData);
        await axiosClient.post("/order", formatData).then((response) => {
          console.log(response);
          if (
            response.error === "Insufficient stock for one or more products."
          ) {
            return notification["error"]({
              message: `Thông báo`,
              description: "Sản phẩm đã hết hàng!",
            });
          }

          if (response == undefined) {
            notification["error"]({
              message: `Thông báo`,
              description: "Đặt hàng thất bại",
            });
          } else {
            notification["success"]({
              message: `Thông báo`,
              description: "Đặt hàng thành công",
            });
            form.resetFields();
            history.push("/final-pay");
            localStorage.removeItem("cart");
            localStorage.removeItem("cartLength");
          }
        });
      } catch (error) {
        throw error;
      }
      setTimeout(function () {
        setLoading(false);
      }, 1000);
    }
  };
  const exchangeRate = 25000; // Giả sử 1 USD = 25000 VND
  const handlePayment = async (values) => {
    try {
      // Tính toán tổng tiền (bao gồm phí ship)
      const totalAmount = Number(totalPrice) + Number(totalFee);

      // Chuyển đổi tổng tiền sang USD
      const totalAmountInUSD = (totalAmount / exchangeRate).toFixed(2); // Giả sử bạn có tỷ giá hối đoái

      const productPayment = {
        price: totalAmountInUSD.toString(), // Chuyển đổi thành chuỗi
        description: values.description, // Sử dụng description từ form
        return_url: "http://localhost:3500" + location.pathname,
        cancel_url: "http://localhost:3500" + location.pathname,
      };

      const response = await axiosClient.post("/payment/pay", productPayment);
      if (response.approvalUrl) {
        localStorage.setItem("session_paypal", response.accessToken);
        return response.approvalUrl; // Trả về URL thanh toán
      } else {
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
        return null;
      }
    } catch (error) {
      throw error;
    }
  };

  const handleModalConfirm = async () => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const paymentId = queryParams.get("paymentId");
      const PayerID = queryParams.get("PayerID");
      const token = localStorage.getItem("session_paypal");
      const description = localStorage.getItem("description");
      const address = localStorage.getItem("address");

      // Gọi API executePayment để thực hiện thanh toán
      const response = await axiosClient.get("/payment/executePayment", {
        params: {
          paymentId,
          token,
          PayerID,
        },
      });

      if (response) {
        const local = localStorage.getItem("user");
        const currentUser = JSON.parse(local);

        // Tính toán tổng số tiền (bao gồm phí ship)
        const totalAmount = Number(totalPrice) + Number(totalFee);

        const formatData = {
          userId: currentUser._id,
          address: address,
          billing: "paypal",
          description: description,
          status: "pending",
          products: productDetail,
          orderTotal: totalAmount, // Lưu tổng số tiền bao gồm phí ship
          paymentId: paymentId, // Lưu paymentId
          payerId: PayerID, // Lưu PayerID
        };

        // Gửi yêu cầu lưu đơn hàng vào CSDL
        const orderResponse = await axiosClient.post("/order", formatData);
        if (orderResponse) {
          notification["success"]({
            message: `Thông báo`,
            description: "Đặt hàng thành công",
          });
          form.resetFields();
          history.push("/final-pay");
          localStorage.removeItem("cart");
          localStorage.removeItem("cartLength");
        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Đặt hàng thất bại",
          });
        }
      } else {
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }

      setShowModal(false);
    } catch (error) {
      console.error("Error executing payment:", error);
      notification["error"]({
        message: `Thông báo`,
        description: "Có lỗi xảy ra trong quá trình thanh toán.",
      });
    }
  };

  const CancelPay = () => {
    form.resetFields();
    history.push("/cart");
  };
  const totalPrice = cart.reduce(
    (acc, item) => acc + item.salePrice * item.stock,
    0
  );
  useEffect(() => {
    (async () => {
      try {
        if (paymentId) {
          setShowModal(true);
        }

        await productApi.getDetailProduct(id).then((item) => {
          setProductDetail(item);
        });
        const local = localStorage.getItem("user");
        const user = JSON.parse(local);
        console.log(user);
        form.setFieldsValue({
          name: user.username,
          email: user.email,
          phone: user.phone,
        });
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log(cart);

        const transformedData = cart.map(
          ({ _id: product, stock, salePrice, price }) => ({
            product,
            stock,
            salePrice,
            price,
          })
        );
        let totalPrice = 0;

        for (let i = 0; i < transformedData.length; i++) {
          let product = transformedData[i];
          console.log(product);
          let price = product.salePrice * product.stock;
          totalPrice += price;
        }

        setOrderTotal(totalPrice);
        setProductDetail(transformedData);
        console.log(transformedData);
        setUserData(user);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);
  const [tinh, setTinh] = useState([]); // Danh sách tỉnh
  const [huyen, setHuyen] = useState([]); // Danh sách huyện
  const [xa, setXa] = useState([]); // Danh sách xã
  const [idXa, setIdXa] = useState(null);
  const [idHuyen2, setIdHuyen] = useState(null);

  const fetchTinh = async () => {
    try {
      const response = await axios.get(
        "https://online-gateway.ghn.vn/shiip/public-api/master-data/province",
        {
          headers: {
            token: "11acfacb-a8a1-11ef-a094-f28ffa88cdab",
          },
        }
      );
      console.log(response, "response");
      setTinh(response.data.data);
    } catch (error) {
      console.error("Lỗi khi tải tỉnh:", error);
    }
  };
  const onGetPrice = async (idx) => {
    // setIdXa(idx);
    await fetchPrice(idx);
  };
  const fetchHuyen = async (idTinh) => {
    try {
      setLoading(true);

      const response = await axios.get(
        "https://online-gateway.ghn.vn/shiip/public-api/master-data/district",
        {
          params: {
            province_id: idTinh,
          },
          headers: {
            token: "11acfacb-a8a1-11ef-a094-f28ffa88cdab",
          },
        }
      );
      setHuyen(response.data.data);
      setXa([]); // Reset xã khi chọn tỉnh mới
    } finally {
      setLoading(false);
    }
  };

  const fetchXa = async (idHuyen) => {
    try {
      setLoading(true);
      setIdHuyen(idHuyen);

      const response = await axios.get(
        "https://online-gateway.ghn.vn/shiip/public-api/master-data/ward",
        {
          params: {
            district_id: idHuyen,
          },
          headers: {
            token: "11acfacb-a8a1-11ef-a094-f28ffa88cdab",
          },
        }
      );
      setXa(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrice = async (cc) => {
    try {
      setLoading(true);
      const dataPayload = {
        service_type_id: 2,
        from_district_id: 1442,
        from_ward_code: "21211",
        to_district_id: idHuyen2,
        to_ward_code: cc,
        height: 1,
        length: 1,
        weight: 1,
        width: 1,
        insurance_value: 0,
        coupon: null,
        items: [
          {
            name: "TEST1",
            stock: 1,
            height: 1,
            weight: 1,
            length: 1,
            width: 1,
          },
        ],
      };
      const response = await axios.post(
        "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee",
        dataPayload,
        {
          headers: {
            token: "11acfacb-a8a1-11ef-a094-f28ffa88cdab",
            shop_id: "5472459",
          },
        }
      );
      console.log(response?.data?.data?.total, "responseresponseresponse");
      setTotalFee(response?.data?.data?.total);
      // setXa(response.data.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTinh();
  }, []);
  return (
    <div class="py-5">
      <Spin spinning={false}>
        <Card className="container">
          <div className="product_detail">
            <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/cart">
                  <LeftSquareOutlined style={{ fontSize: "24px" }} />
                  <span> Quay lại giỏ hàng</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="">
                  <span>Thanh toán</span>
                </Breadcrumb.Item>
              </Breadcrumb>

              <div className="payment_progress">
                <Steps
                  current={1}
                  percent={60}
                  items={[
                    {
                      title: "Chọn sản phẩm",
                    },
                    {
                      title: "Thanh toán",
                    },
                    {
                      title: "Hoàn thành",
                    },
                  ]}
                />
              </div>

              <div className="information_pay">
                <Form
                  form={form}
                  onFinish={accountCreate}
                  name="eventCreate"
                  layout="vertical"
                  initialValues={{
                    residence: ["zhejiang", "hangzhou", "xihu"],
                    prefix: "86",
                  }}
                  scrollToFirstError
                >
                  <Form.Item
                    name="name"
                    label="Tên"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input placeholder="Tên" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Email"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input disabled placeholder="Email" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input placeholder="Số điện thoại" />
                  </Form.Item>

                  <Form.Item
                    name="address5"
                    label="Tỉnh/Thành"
                    hasFeedback
                    rules={[
                      { required: true, message: "Vui lòng chọn tỉnh/thành!" },
                    ]}
                    style={{ marginBottom: 15 }}
                  >
                    <Select
                      placeholder="Chọn Tỉnh/Thành"
                      className="w-full"
                      allowClear
                      onChange={(e) => fetchHuyen(e)}
                    >
                      {tinh.map((item) => (
                        <Option key={item.ProvinceID} value={item.ProvinceID}>
                          {item.ProvinceName}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="address2"
                    label="Quận/Huyện"
                    hasFeedback
                    rules={[
                      { required: true, message: "Vui lòng chọn quận/huyện!" },
                      () => ({
                        validator(_, value) {
                          if (!value && huyen.length === 0) {
                            return Promise.reject(
                              new Error("Vui lòng chọn tỉnh/thành trước!")
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                    style={{ marginBottom: 15 }}
                  >
                    <Select
                      placeholder="Chọn Quận/Huyện"
                      className="w-full"
                      allowClear
                      onChange={(e) => fetchXa(e)}
                      disabled={!huyen.length}
                    >
                      {huyen.map((item) => (
                        <Option key={item.DistrictID} value={item.DistrictID}>
                          {item.DistrictName}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="address3"
                    label="Xã/Phường"
                    hasFeedback
                    rules={[
                      { required: true, message: "Vui lòng chọn xã/phường!" },
                      () => ({
                        validator(_, value) {
                          if (!value && xa.length === 0) {
                            return Promise.reject(
                              new Error("Vui lòng chọn quận/huyện trước!")
                            );
                          }
                          return Promise.resolve();
                        },
                      }),
                    ]}
                    style={{ marginBottom: 15 }}
                  >
                    <Select
                      placeholder="Chọn Xã/Phường"
                      className="w-full"
                      allowClear
                      onChange={(e) => onGetPrice(e)}
                      disabled={!xa.length}
                    >
                      {xa.map((item) => (
                        <Option key={item.WardCode} value={item.WardCode}>
                          {item.WardName}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <p>Phí ship</p>
                  <p className="font-bold text-black text-xl">
                    {totalFee?.toLocaleString()} VND
                  </p>
                  <p>Tổng tiền ( bao gồm phí ship)</p>
                  <p className="font-bold text-black text-xl">
                    {(Number(totalPrice) + Number(totalFee))?.toLocaleString()}{" "}
                    VND
                  </p>

                  <Form.Item
                    name="address"
                    label="Nhập chi tiết số nhà, ngách ngõ"
                    hasFeedback
                    style={{ marginBottom: 15 }}
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập chi tiết địa chỉ!",
                      },
                      {
                        min: 5,
                        message: "Địa chỉ phải có ít nhất 5 ký tự!",
                      },
                    ]}
                  >
                    <Input placeholder="Chi tiết Địa chỉ" />
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="Lưu ý cho đơn hàng"
                    hasFeedback
                    style={{ marginBottom: 15 }}
                  >
                    <Input.TextArea rows={4} placeholder="Lưu ý" />
                  </Form.Item>

                  <Form.Item
                    name="billing"
                    label="Phương thức thanh toán"
                    hasFeedback
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng chọn phương thức thanh toán!",
                      },
                    ]}
                    style={{ marginBottom: 10 }}
                  >
                    <Radio.Group>
                      <Radio value={"cod"}>COD</Radio>
                      <Radio value={"paypal"}>PAYPAL</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      className="border border-gray-300 text-gray-900 py-2 px-4 rounded hover:bg-gray-100"
                      onClick={CancelPay}
                    >
                      Trở về
                    </button>

                    <button
                      className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5"
                      htmlType="submit"
                    >
                      Hoàn thành
                    </button>
                  </div>
                </Form>
              </div>
            </div>
          </div>
        </Card>
        <Modal
          visible={showModal}
          onOk={handleModalConfirm}
          onCancel={() => setShowModal(false)}
        >
          <p>Bạn có chắc chắn muốn xác nhận thanh toán ?</p>
        </Modal>
      </Spin>
    </div>
  );
};

export default Pay;
