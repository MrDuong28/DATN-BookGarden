import { CreditCardOutlined, LeftSquareOutlined } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Form,
  InputNumber,
  Layout,
  Row,
  Spin,
  Statistic,
  Table,
} from "antd";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import "./cart.css";

const { Content } = Layout;

const Cart = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLength, setCartLength] = useState();
  const [cartTotal, setCartTotal] = useState();
  const [form] = Form.useForm();
  let { id } = useParams();
  const history = useHistory();

  const handlePay = () => {
    history.push("/pay");
  };

  const deleteCart = () => {
    localStorage.removeItem("cart");
    localStorage.setItem("cartLength", 0);
    setProductDetail([]);
    setCartTotal(0);
    setCartLength(0);
  };
  console.log(productDetail);

  const updateStock = (productId, newStock) => {
    // Tìm kiếm sản phẩm trong giỏ hàng
    if (newStock === 0) {
      return handleDelete(productId);
    }
    const updatedCart = productDetail.map((item) => {
      if (item._id === productId) {
        // Cập nhật số lượng và tính toán tổng tiền
        item.stock = newStock;
        item.total = item.salePrice * newStock;
      }
      return item;
    });
    const total = updatedCart.reduce(
      (acc, item) => acc + item.stock * item.salePrice,
      0
    );
    setCartTotal(total);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setProductDetail(updatedCart);
  };

  const handleDelete = (productId) => {
    const updatedCart = productDetail.filter(
      (product) => product._id !== productId
    );
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    localStorage.setItem("cartLength", updatedCart.length);
    setProductDetail(updatedCart);
    setCartLength(updatedCart.length);

    // Tính lại tổng tiền
    const total = updatedCart.reduce(
      (acc, item) => acc + item.stock * item.salePrice,
      0
    );
    setCartTotal(total);
  };

  const columns = [
    {
      title: "ID",
      key: "index",
      render: (text, record, index) => index + 1,
    },
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      render: (image) => <img src={image} style={{ height: 80 }} />,
      width: "10%",
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <a onClick={() => handleRowClick(record)}>{text}</a>
      ),
    },
    {
      title: "Giá",
      dataIndex: "salePrice",
      key: "salePrice",
      render: (text) => (
        <a>
          {text?.toLocaleString("vi", { style: "currency", currency: "VND" })}
        </a>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "stock",
      key: "stock",
      render: (text, record) => (
        <InputNumber
          min={0}
          defaultValue={text}
          onChange={(value) => {
            updateStock(record._id, value);
          }}
        />
      ),
    },
    {
      title: "Thành tiền",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (text, record) => (
        <div>
          <div className="groupButton">
            {(record?.salePrice * record?.stock).toLocaleString("vi", {
              style: "currency",
              currency: "VND",
            })}
          </div>
        </div>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (text, record) => (
        <Button type="danger" onClick={() => handleDelete(record._id)}>
          Xóa
        </Button>
      ),
    },
  ];

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    setProductDetail(cart);
    const cartLength = localStorage.getItem("cartLength") || 0;
    setCartLength(parseInt(cartLength));
    const total = cart.reduce(
      (acc, item) => acc + item.stock * item.salePrice,
      0
    );
    setCartTotal(total);
    setLoading(false);
    window.scrollTo(0, 0);
  }, []);

  // Thêm vào component của bạn
  const handleRowClick = (record) => {
    history.push("/product-detail/" + record._id);
  };

  const handleNavigateToHome = () => {
    history.push("/"); // Chuyển hướng về trang home
  };

  return (
    <div>
      <div class="py-5">
        <Spin spinning={false}>
          <Card className="container">
            <div className="box_cart">
              <Layout className="box_cart">
                <Content className="site-layout-background">
                  <Breadcrumb>
                    <Breadcrumb.Item onClick={handleNavigateToHome}>
                      <LeftSquareOutlined style={{ fontSize: "24px" }} />
                      <span> Tiếp tục mua sắm</span>
                    </Breadcrumb.Item>
                  </Breadcrumb>
                  <hr></hr>
                  <br></br>
                  <Row>
                    <Col span={12}>
                      <h4>
                        <strong>{cartLength}</strong> Sản Phẩm
                      </h4>
                    </Col>
                    <Col span={12}>
                      <Button type="default" danger style={{ float: "right" }}>
                        <span onClick={() => deleteCart()}>Xóa tất cả</span>
                      </Button>
                    </Col>
                  </Row>
                  <br></br>
                  <Table
                    columns={columns}
                    dataSource={productDetail}
                    pagination={false}
                  />

                  <Divider orientation="right">
                    <p>Thanh toán</p>
                  </Divider>
                  <Row justify="end">
                    <Col>
                      <h6>Tổng {cartLength} sản phẩm</h6>
                      <Statistic
                        title="Tổng tiền (đã bao gồm VAT)."
                        value={cartTotal}
                        precision={0}
                        formatter={(value) =>
                          `${value.toLocaleString("vi", {
                            style: "currency",
                            currency: "VND",
                          })}`
                        }
                      />

                      <Button
                        style={{ marginTop: 16 }}
                        type="primary"
                        onClick={() => handlePay()}
                        disabled={productDetail.length === 0} // Nếu giỏ hàng trống, vô hiệu hóa button
                      >
                        Thanh toán ngay{" "}
                        <CreditCardOutlined style={{ fontSize: "20px" }} />
                      </Button>
                    </Col>
                  </Row>
                </Content>
              </Layout>
            </div>
          </Card>
        </Spin>
      </div>
    </div>
  );
};

export default Cart;
