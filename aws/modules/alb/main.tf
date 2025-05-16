/* 
 * AWS Application Load Balancer (ALB) module
 * This module creates an ALB for the EKS cluster
 */

resource "aws_security_group" "alb" {
  name        = "${var.environment}-${var.project_name}-alb-sg"
  description = "Security group for the ALB"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTP traffic"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow HTTPS traffic"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = {
    Name        = "${var.environment}-${var.project_name}-alb-sg"
    Environment = var.environment
    Project     = var.project_name
    Organization = var.org_name
    Squad       = var.squad_name
    ManagedBy   = "terraform"
  }
}

resource "aws_lb" "this" {
  name               = "${var.environment}-${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.subnet_ids

  enable_deletion_protection = false

  tags = {
    Name        = "${var.environment}-${var.project_name}-alb"
    Environment = var.environment
    Project     = var.project_name
    Organization = var.org_name
    Squad       = var.squad_name
    ManagedBy   = "terraform"
    Cluster     = var.cluster_name
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "No routes configured"
      status_code  = "404"
    }
  }
}

# Optionally create HTTPS listener
# Uncomment if you want to add SSL/TLS support
# Note: You'll need to provide an ACM certificate ARN
/*
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "No routes configured"
      status_code  = "404"
    }
  }
}
*/ 