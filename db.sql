create database ShirtShop;

create table COLORS (
    id SERIAL PRIMARY KEY,
    color VARCHAR(50) unique not null
);

create table SIZES (
    id SERIAL PRIMARY KEY,
    size VARCHAR(5) unique not null
)

create table FONTS (
    id SERIAL PRIMARY KEY,
    font VARCHAR(50) unique not null
)

create table PRINT_SIZES (
    id SERIAL PRIMARY KEY,
    size VARCHAR(5) unique not null
)

CREATE TABLE ORDERS (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES USERS(id) not null,
    address VARCHAR(255) not null,
    color_id INT REFERENCES COLORS(id) not null,
    size_id INT REFERENCES SIZES(id) not null,
    front VARCHAR(50),
    font_id INT REFERENCES FONTS(id),
    print_size_id INT REFERENCES PRINT_SIZES(id),
    image_path VARCHAR(255),
    print_text VARCHAR(255),
    status_id INT REFERENCES ORDER_STATUSES(id) NOT NULL DEFAULT 1,
    track_number VARCHAR(255),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ORDER_STATUSES (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE Users (
    id NUMERIC PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(255),
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ADMINS (
    id SERIAL PRIMARY KEY,
    login VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE PRICE (
    id SERIAL PRIMARY KEY,
    price DECIMAL NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION get_user(input_user_id NUMERIC)
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS WHERE id = input_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF USERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM USERS ORDER BY reg_date DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_user(input_id NUMERIC, input_name VARCHAR, input_phone VARCHAR)
RETURNS NUMERIC AS $$
DECLARE
    new_user_id NUMERIC;
BEGIN
    IF EXISTS (SELECT 1 FROM Users WHERE id = input_id) THEN
        RAISE EXCEPTION 'User with this id exists';
    END IF;

    INSERT INTO Users (id, name, phone) VALUES (input_id, input_name, input_phone) RETURNING id INTO new_user_id;

    IF new_user_id IS NULL THEN
        RAISE EXCEPTION 'Error adding a user';
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auth_admin(
    p_login VARCHAR(100),
    p_password VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_login = '' OR p_login = null OR p_password = '' OR p_password = null THEN
        RAISE EXCEPTION 'Login and password cannot be null';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ADMINS WHERE ADMINS.login = p_login AND ADMINS.password = p_password) THEN
        RAISE EXCEPTION 'Invalid login or password';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_sizes()
RETURNS TABLE(id INT, size VARCHAR) AS $$
BEGIN
    RETURN QUERY SELECT * FROM SIZES;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_colors()
RETURNS TABLE(id INT, color VARCHAR) AS $$
BEGIN
    RETURN QUERY SELECT * FROM COLORS;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_fonts()
RETURNS TABLE(id INT, font VARCHAR) AS $$
BEGIN
    RETURN QUERY SELECT * FROM FONTS;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_print_sizes()
RETURNS TABLE(id INT, size VARCHAR) AS $$
BEGIN
    RETURN QUERY SELECT * FROM PRINT_SIZES;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orders(p_status_id INT)
RETURNS SETOF ORDERS AS $$
BEGIN
    RETURN QUERY SELECT * FROM ORDERS
        WHERE status_id =  p_status_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_statuses()
RETURNS SETOF ORDER_STATUSES AS $$
BEGIN
    RETURN QUERY SELECT * FROM ORDER_STATUSES;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_order(order_id INT)
RETURNS TABLE(
    id INT,
    user_id INT,
    address VARCHAR,
    color VARCHAR(50),
    size VARCHAR(5),
    font VARCHAR(50),
    print_size VARCHAR(5),
    image_path VARCHAR(255),
    print_text VARCHAR(255),
    status VARCHAR(50),
    track_number VARCHAR(255),
    order_date TIMESTAMP,
    phone VARCHAR(255),
    front VARCHAR(50)
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ORDERS WHERE ORDERS.id = order_id) THEN
        RAISE EXCEPTION 'Order ID % does not exist', order_id;
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.user_id,
        o.address,
        c.color,
        s.size,
        f.font,
        ps.size AS print_size,
        o.image_path,
        o.print_text,
        os.status,
        o.track_number,
        o.order_date,
        u.phone,
        o.front
    FROM 
        ORDERS o
        INNER JOIN COLORS c ON o.color_id = c.id
        INNER JOIN SIZES s ON o.size_id = s.id
        LEFT JOIN FONTS f ON o.font_id = f.id
        LEFT JOIN PRINT_SIZES ps ON o.print_size_id = ps.id
        INNER JOIN ORDER_STATUSES os ON o.status_id = os.id
        INNER JOIN USERS u ON o.user_id = u.id
    WHERE 
        o.id = order_id
    ORDER BY 
        o.id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_order(
    p_user_id NUMERIC,
    p_address VARCHAR,
    p_color_id INT, 
    p_size_id INT, 
    p_front VARCHAR,
    p_font_id INT, 
    p_print_size_id INT, 
    p_image_path VARCHAR,
    p_print_text VARCHAR
)
RETURNS INT AS $$
DECLARE
    new_order_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM USERS WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'User ID % does not exist', p_color_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM COLORS WHERE id = p_color_id) THEN
        RAISE EXCEPTION 'Color ID % does not exist', p_color_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM SIZES WHERE id = p_size_id) THEN
        RAISE EXCEPTION 'Size ID % does not exist', p_size_id;
    END IF;
    
    IF p_font_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM FONTS WHERE id = p_font_id) THEN
        RAISE EXCEPTION 'Font ID % does not exist', p_font_id;
    END IF;
    
    IF p_print_size_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM PRINT_SIZES WHERE id = p_print_size_id) THEN
        RAISE EXCEPTION 'Print Size ID % does not exist', p_print_size_id;
    END IF;
    
    INSERT INTO ORDERS (user_id, address, color_id, size_id, front, font_id, print_size_id, image_path, print_text)
    VALUES (p_user_id, p_address, p_color_id, p_size_id, p_front, p_font_id, p_print_size_id, p_image_path, p_print_text)
    RETURNING id INTO new_order_id;
    
    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION change_order_status(p_order_id INT, p_status_id INT)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ORDERS WHERE id = p_order_id) THEN
        RAISE EXCEPTION 'Order ID % does not exist', p_order_id;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM ORDER_STATUSES WHERE id = p_status_id) THEN
        RAISE EXCEPTION 'Status % does not exist', p_status_id;
    END IF;
    
    UPDATE ORDERS
    SET status_id = p_status_id
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION change_track_number(p_order_id INT, p_track_number VARCHAR)
RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM ORDERS WHERE id = p_order_id) THEN
        RAISE EXCEPTION 'Order ID % does not exist', p_order_id;
    END IF;
    
    UPDATE ORDERS
    SET track_number = p_track_number
    WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_color(p_color_id INT)
RETURNS SETOF COLORS AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM COLORS WHERE id = p_color_id) THEN
        RAISE EXCEPTION 'Color ID % does not exist', p_color_id;
    END IF;

    RETURN QUERY SELECT id, color FROM COLORS WHERE id = p_color_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_size(p_size_id INT)
RETURNS SETOF SIZES AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM SIZES WHERE id = p_size_id) THEN
        RAISE EXCEPTION 'Size ID % does not exist', p_size_id;
    END IF;

    RETURN QUERY SELECT id, size FROM SIZES WHERE id = p_size_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_font(p_font_id INT)
RETURNS SETOF FONTS AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM FONTS WHERE id = p_font_id) THEN
        RAISE EXCEPTION 'Font ID % does not exist', p_font_id;
    END IF;

    RETURN QUERY SELECT id, font FROM FONTS WHERE id = p_font_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_print_size(p_print_size_id INT)
RETURNS SETOF PRINT_SIZES AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM PRINT_SIZES WHERE id = p_print_size_id) THEN
        RAISE EXCEPTION 'Print Size ID % does not exist', p_print_size_id;
    END IF;

    RETURN QUERY SELECT id, size FROM PRINT_SIZES WHERE id = p_print_size_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_orders_by_user(p_user_id NUMERIC)
RETURNS TABLE(
    id INT,
    user_id INT,
    address VARCHAR,
    color VARCHAR(50),
    size VARCHAR(5),
    font VARCHAR(50),
    print_size VARCHAR(5),
    image_path VARCHAR(255),
    print_text VARCHAR(255),
    status VARCHAR(50),
    track_number VARCHAR(255),
    order_date TIMESTAMP
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM USERS WHERE USERS.id = p_user_id) THEN
        RAISE EXCEPTION 'User ID % does not exist', p_user_id;
    END IF;

    RETURN QUERY
    SELECT 
        o.id,
        o.user_id,
        o.address,
        c.color,
        s.size,
        f.font,
        ps.size AS print_size,
        o.image_path,
        o.print_text,
        os.status,
        o.track_number,
        o.order_date
    FROM 
        ORDERS o
        INNER JOIN COLORS c ON o.color_id = c.id
        INNER JOIN SIZES s ON o.size_id = s.id
        LEFT JOIN FONTS f ON o.font_id = f.id
        LEFT JOIN PRINT_SIZES ps ON o.print_size_id = ps.id
        INNER JOIN ORDER_STATUSES os ON o.status_id = os.id
    WHERE 
        o.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_latest_price()
RETURNS SETOF PRICE AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM PRICE
    ORDER BY updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_price(new_price DECIMAL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO PRICE (price)
    VALUES (new_price);
END;
$$ LANGUAGE plpgsql;

GRANT SELECT ON TABLE PRICE TO shirt_user;
GRANT SELECT, INSERT ON TABLE PRICE TO shirt_admin;

GRANT USAGE, SELECT ON SEQUENCE price_id_seq TO shirt_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE price_id_seq TO shirt_admin;

insert into PRICE (price) VALUES (1000);

delete from colors;
delete from sizes;
delete from fonts;
delete from print_sizes;

INSERT INTO COLORS (id, color) VALUES
(1, 'Чёрный'),
(2, 'Белый');

INSERT INTO SIZES (id, size) VALUES
(1, 'XS'),
(2, 'S'),
(3, 'M'),
(4, 'L'),
(5, 'XL'),
(6, '2XL'),
(7, '3XL');

INSERT INTO FONTS (id, font) VALUES
(1, 'Arial Narrow'),
(2, 'Heattenschweiler'),
(3, 'Bookman Old Style'),
(4, 'Mistral'),
(5, 'Comic Sans MS'),
(6, 'Monotype Corsiva'),
(7, 'Franklin Gothic Heavy'),
(8, 'Book Antiqua');

INSERT INTO PRINT_SIZES (id, size) VALUES
(1, 'A3'),
(2, 'A4'),
(3, 'A5'),
(4, 'A6');

INSERT INTO ORDER_STATUSES (id, status) VALUES
(1, 'Ожидает'),
(2, 'В обработке'),
(3, 'Отправлен'),
(4, 'Доставлен'),
(5, 'Отменён');

CREATE ROLE shirt_user LOGIN PASSWORD '123123';
CREATE ROLE shirt_admin LOGIN PASSWORD '123123';

GRANT SELECT, INSERT, UPDATE ON TABLE ORDERS TO shirt_user;
GRANT SELECT ON TABLE COLORS TO shirt_user;
GRANT SELECT ON TABLE SIZES TO shirt_user;
GRANT SELECT ON TABLE FONTS TO shirt_user;
GRANT SELECT ON TABLE PRINT_SIZES TO shirt_user;
GRANT SELECT ON TABLE ORDER_STATUSES TO shirt_user;
GRANT SELECT, INSERT, UPDATE ON TABLE USERS TO shirt_user;
GRANT SELECT ON TABLE PRICE TO shirt_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE PRICE TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ORDERS TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE COLORS TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE SIZES TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE FONTS TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE PRINT_SIZES TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ORDER_STATUSES TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE USERS TO shirt_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ADMINS TO shirt_admin;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE orders_id_seq TO shirt_admin;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO shirt_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE price_id_seq TO shirt_admin;